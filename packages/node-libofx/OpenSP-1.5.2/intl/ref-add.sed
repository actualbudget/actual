/^# Packages using this file: / {
  s/# Packages using this file://
  ta
  :a
  s/ OpenSP / OpenSP /
  tb
  s/ $/ OpenSP /
  :b
  s/^/# Packages using this file:/
}
