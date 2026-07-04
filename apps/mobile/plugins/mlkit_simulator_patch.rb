# Called from ios/Podfile's post_install hook. The hook-up line is inserted by
# the with-mlkit-simulator-patch Expo config plugin, so it survives
# `npx expo prebuild --clean` regenerating the Podfile.
#
# Why this exists: MLKit beta pods ship arm64 slices built for iOS device only —
# no arm64 simulator slice. Xcode 26 requires arm64 for the simulator on Apple
# Silicon and no longer runs x86_64 via Rosetta, so without this patch the
# simulator build fails. EAS device builds don't need it (guarded below).
def apply_mlkit_simulator_patch(installer)
  return if ENV['EAS_BUILD']

  # MLKit xcconfigs exclude arm64 from simulator — remove so Apple Silicon sims work.
  Dir.glob(File.join(installer.sandbox.root, "Target Support Files", "**", "*.xcconfig")).each do |f|
    content = File.read(f)
    next unless content.include?("EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64")
    File.write(f, content.gsub("EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64", ""))
  end

  # Retag every LC_BUILD_VERSION load command from platform 2 (iOS) to 7
  # (iOSSimulator) by byte-patching the archives in place. In-place is
  # deliberate: extracting with `ar -x` collapses duplicate member names
  # and silently drops symbols. Idempotent — re-runs find nothing to change.
  Dir.glob(File.join(installer.sandbox.root, "{MLKit*,MLImage}", "Frameworks", "*.framework", "*")).each do |fw|
    next unless File.file?(fw) && `file "#{fw}"` =~ /fat file|ar archive|universal binary/
    ok = system("python3", "-c", <<~PY, fw)
      import struct, sys
      path = sys.argv[1]
      with open(path, 'rb') as f:
          data = bytearray(f.read())
      count = 0
      for cmdsize in (24, 32):
          needle = struct.pack('<III', 0x32, cmdsize, 2)  # LC_BUILD_VERSION, platform iOS
          repl = struct.pack('<III', 0x32, cmdsize, 7)    # platform iOSSimulator
          start = 0
          while True:
              i = data.find(needle, start)
              if i < 0:
                  break
              data[i:i+12] = repl
              count += 1
              start = i + 12
      if count:
          with open(path, 'wb') as f:
              f.write(data)
      print(f"retagged {count} load commands in {path.rsplit('/', 1)[-1]}")
    PY
    raise "MLKit simulator patch failed for #{fw}" unless ok
  end
end
