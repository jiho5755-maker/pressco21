local appName = "KakaoTalk"
local app = hs.application.get(appName) or hs.application.launchOrFocus(appName)
if not app then
  print("APP_NOT_FOUND")
  return
end

hs.timer.doAfter(1.5, function()
  app = hs.application.get(appName)
  if not app then
    print("APP_NOT_RUNNING")
    return
  end

  app:activate(true)
  local win = app:mainWindow() or app:focusedWindow()
  if win then
    win:focus()
    print("FOCUS_OK")
  else
    print("WINDOW_NOT_FOUND")
  end
end)
