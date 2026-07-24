Pod::Spec.new do |s|
  s.name           = 'OrbitWidgets'
  s.version        = '1.0.0'
  s.summary        = 'Share data with the Orbit iOS widget via an App Group.'
  s.description    = 'Writes shared values into the App Group and reloads widget timelines.'
  s.author         = { 'Orbit' => 'dev@orbit.app' }
  s.homepage       = 'https://orbit.app'
  s.license        = { :type => 'MIT' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
