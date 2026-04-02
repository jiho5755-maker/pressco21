local roomName = "jin"
local messageText = "ㅎㅇ"
local appName = "KakaoTalk"

local function press(mods, key)
  hs.eventtap.keyStroke(mods, key, 0)
end

local function typeText(txt)
  hs.eventtap.keyStrokes(txt)
end

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
  if not win then
    print("WINDOW_NOT_FOUND")
    return
  end
  win:focus()

  hs.timer.usleep(600000)
  press({"cmd"}, "f")
  hs.timer.usleep(700000)
  press({"cmd"}, "a")
  hs.timer.usleep(100000)
  press({}, "delete")
  hs.timer.usleep(150000)
  typeText(roomName)
  hs.timer.usleep(1200000)
  press({}, "return")
  hs.timer.usleep(1200000)
  typeText(messageText)
  hs.timer.usleep(300000)
  press({}, "return")
  print("SEND_ATTEMPTED")
end)
