local targetTitle = hs.settings.get("kakao_target_title") or "jin"
local messageText = hs.settings.get("kakao_message_text") or "ㅎㅇ"
local appName = "카카오톡"

local function getKakaoApp()
  return hs.application.get(appName) or hs.appfinder.appFromName(appName) or hs.application.find(appName)
end

local function findTargetWindow()
  local app = getKakaoApp()
  if not app then return nil, "APP_NOT_FOUND" end
  local wins = app:allWindows()
  for _, win in ipairs(wins) do
    local title = win:title() or ""
    if string.find(string.lower(title), string.lower(targetTitle), 1, true) then
      return win, nil
    end
  end
  return nil, "WINDOW_NOT_FOUND"
end

local function clickInputArea(win)
  local f = win:frame()
  local x = f.x + (f.w * 0.62)
  local y = f.y + (f.h * 0.94)
  hs.mouse.absolutePosition({x=x, y=y})
  hs.eventtap.leftClick({x=x, y=y})
end

local win, err = findTargetWindow()
if not win then
  print(err)
  return
end

win:focus()
hs.timer.usleep(700000)
clickInputArea(win)
hs.timer.usleep(400000)
hs.eventtap.keyStrokes(messageText)
hs.timer.usleep(200000)
hs.eventtap.keyStroke({}, 'return', 0)
print("SEND_ATTEMPTED:" .. targetTitle)
