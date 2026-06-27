Pod::Spec.new do |s|
  s.name           = 'MenuTextDetector'
  s.version        = '1.0.0'
  s.summary        = 'On-device text detection (Apple Vision) pre-check'
  s.description    = 'Detects the presence of text in an image using VNRecognizeTextRequest before menu analysis.'
  s.author         = ''
  s.homepage       = 'https://eatoutbetter.app'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'Vision'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
