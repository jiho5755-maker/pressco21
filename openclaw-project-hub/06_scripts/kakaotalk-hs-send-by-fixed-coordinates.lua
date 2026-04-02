local targetTitle = hs.settings.get("kakao_target_title") or "jin"
local messageText = hs.settings.get("kakao_message_text") or "ㅎㅇ"
local appName = "카카오톡"
local coordPath = os.getenv("HOME") .. "/workspace/pressco21/openclaw-project-hub/04_reference_json/kakaotalk-click-coordinates.json"

local function readFile(path)
  local f = io.open(path, "r")
  if not f then return nil end
  local c = f:read("*a")
  f:close()
  return c
end

local function getCoords(key)
  local json = readFile(coordPath)
  if not json then return nil end
  local x, y = string.match(json, '"' .. key .. '"%s*:%s*%{%s*"x"%s*:%s*(%-?%d+)%s*,%s*"y"%s*:%s*(%-?%d+)')
  if not x then return nil end
  return { x = tonumber(x), y = tonumber(y) }
end

local function getApp()
  return hs.application.get(appName) or hs.appfinder.appFromName(appName) or hs.application.find(appName)
end

local function press(mods, key)
  hs.eventtap.keyStroke(mods, key, 0)
end

local function typeText(txt)
  hs.eventtap.keyStrokes(txt)
end

local function clickPoint(pt)
  hs.mouse.absolutePosition(pt)
  hs.eventtap.leftClick(pt)
end

local function findWindowByTitlePart(app, target)
  local wins = app:allWindows()
  for _, win in ipairs(wins) do
    local title = win:title() or ""
    if string.find(string.lower(title), string.lower(target), 1, true) then
      return win
    end
  end
  return nil
end

local app = getApp()
if not app then print("APP_NOT_FOUND") return end

local targetWin = findWindowByTitlePart(app, targetTitle)
if not targetWin then
  print("TARGET_WINDOW_NOT_FOUND")
  return
end

targetWin:focus()
hs.timer.usleep(900000)

-- kill lingering search focus inside KakaoTalk main window
press({}, "escape")
hs.timer.usleep(250000)
press({}, "escape")
hs.timer.usleep(250000)

local pt
if string.lower(targetTitle) == "jin" or targetTitle == "지호" then
  pt = getCoords("jin_input")
elseif string.find(targetTitle, "디자인", 1, true) then
  pt = getCoords("design_team_input")
else
  pt = getCoords("jin_input")
end

if not pt then
  print("COORD_NOT_FOUND")
  return
end

clickPoint(pt)
hs.timer.usleep(400000)
clickPoint(pt)
hs.timer.usleep(400000)
press({}, "tab")
hs.timer.usleep(150000)
press({"shift"}, "tab")
hs.timer.usleep(200000)
typeText(messageText)
hs.timer.usleep(250000)
press({}, "return")
print("FIXED_SEND_ATTEMPTED:" .. targetTitle)
