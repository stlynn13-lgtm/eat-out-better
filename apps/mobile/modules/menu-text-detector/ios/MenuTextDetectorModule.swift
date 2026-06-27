import ExpoModulesCore
import Vision
import UIKit

public class MenuTextDetectorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MenuTextDetector")

    // Runs Apple's Vision text recognition on a local image and returns raw
    // counts. All policy/thresholds live in JS so they can be tuned without a
    // native rebuild.
    AsyncFunction("detectText") { (uri: String, promise: Promise) in
      guard let image = MenuTextDetectorModule.loadImage(from: uri),
            let cgImage = image.cgImage else {
        promise.reject("ERR_IMAGE_LOAD", "Could not load image at \(uri)")
        return
      }

      let request = VNRecognizeTextRequest { request, error in
        if let error = error {
          promise.reject("ERR_VISION", error.localizedDescription)
          return
        }

        let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
        var blockCount = 0
        var charCount = 0
        var confidenceSum: Float = 0

        for observation in observations {
          guard let candidate = observation.topCandidates(1).first else { continue }
          let text = candidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
          if text.isEmpty { continue }
          blockCount += 1
          charCount += text.count
          confidenceSum += candidate.confidence
        }

        let averageConfidence = blockCount > 0 ? confidenceSum / Float(blockCount) : 0

        promise.resolve([
          "blockCount": blockCount,
          "charCount": charCount,
          "averageConfidence": averageConfidence
        ])
      }

      // .fast is plenty for presence detection and keeps it snappy; we don't
      // need accurate transcription, just "is there meaningful text here?"
      request.recognitionLevel = .fast
      request.usesLanguageCorrection = false

      let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          try handler.perform([request])
        } catch {
          promise.reject("ERR_VISION", error.localizedDescription)
        }
      }
    }
  }

  private static func loadImage(from uri: String) -> UIImage? {
    if let url = URL(string: uri), url.scheme != nil {
      if let data = try? Data(contentsOf: url) {
        return UIImage(data: data)
      }
    }
    // Fallback: treat as a bare file path.
    return UIImage(contentsOfFile: uri)
  }
}
