import { Players, ReplicatedFirst, TweenService, UserInputService as UIS, Workspace as World } from "@rbxts/services";
import { RaycastParamsBuilder, TweenInfoBuilder } from "@rbxts/builders";
import StringUtils from "@rbxts/string-utils";

import { DragonInfo, Rarity, StorableVector3 } from "./data-models";
import { Exception } from "./exceptions";

const { floor, log, round } = math;

export type Placable = "Decor" | "Buildings" | "Habitats" | "Dragons";

export const Assets = ReplicatedFirst.Assets;
export const Player = Players.LocalPlayer;

export const now = () => round(tick());
export const toStorableVector3 = ({ X, Y, Z }: Vector3) => ({ x: X, y: Y, z: Z })
export const toUsableVector3 = ({ x, y, z }: StorableVector3) => new Vector3(x, y, z);

const RAY_DISTANCE = 1000;
export function getMouseWorldPosition(distance = RAY_DISTANCE): Vector3 {
  const { X, Y } = UIS.GetMouseLocation();
  const { Origin, Direction } = World.CurrentCamera!.ViewportPointToRay(X, Y);
  const raycastParams = new RaycastParamsBuilder()
    .SetIgnoreWater(true)
    .AddToFilter(World.Ignore)
    .Build();

  const raycastResult = World.Raycast(Origin, Direction.mul(distance), raycastParams);
  if (raycastResult)
    return raycastResult.Position;
  else
    return Origin.add(Direction.mul(distance));
}

export function tween<T extends Instance = Instance>(
  instance: T,
  tweenInfo: TweenInfo | TweenInfoBuilder,
  goal: Partial<ExtractMembers<T, Tweenable>>
): Tween {

  if ("Build" in tweenInfo)
    tweenInfo = tweenInfo.Build();

  const tween = TweenService.Create(instance, tweenInfo, goal);
  tween.Play();
  return tween;
}

export function getDragonData(dragonModel: Model): DragonInfo {
  const dataModule = <ModuleScript>dragonModel.WaitForChild("Data");
  return <DragonInfo>require(dataModule);
}

export function getRarityImage(rarity: Rarity): string {
  switch (rarity) {
    case "Basic": return "rbxassetid://14399932656";
    case "Rare": return "rbxassetid://14400364792";
    case "Epic": return "rbxassetid://14400364959";
    case "Legendary": return "rbxassetid://14400365128";
    case "Mythic": return "rbxassetid://14233300725";
  }
}

const s = 1,
  m = 60,
  h = 3600,
  d = 86400,
  w = 604800;

const timePatterns = {
  s, second: s, seconds: s,
  m, minute: m, minutes: m,
  h, hour: h, hours: h,
  d, day: d, days: d,
  w, week: w, weeks: w
};

// Takes a remaining time string (e.g. 1d 5h 10s) and
// converts it to the amount of time it represents in seconds.
export function toSeconds(time: string): number {
  let seconds = 0;
  for (const [value, unit] of time.gsub(" ", "")[0].gmatch("(%d+)(%a)")) {
    const timeUnit = <keyof typeof timePatterns>unit;
    const figure = <number>value;
    seconds += figure * timePatterns[timeUnit];
  }

  return seconds;
}

// Takes a time in seconds (e.g. 310) and converts
// it to a remaining time string (e.g. 5m 10s)
export function toRemainingTime(seconds: number): string {
  const dayDivisor = 60 * 60 * 24;
  const days = floor(seconds / dayDivisor);
  seconds %= dayDivisor;

  const hourDivisor = 60 * 60;
  const hours = floor(seconds / hourDivisor);
  seconds %= hourDivisor;

  const minuteDivisor = 60;
  const minutes = floor(seconds / minuteDivisor);
  seconds %= minuteDivisor;

  let remainingTime = "";
  if (days > 0)
    remainingTime += "%dd ".format(days);
  if (hours > 0)
    remainingTime += "%dh ".format(hours);
  if (minutes > 0)
    remainingTime += "%dm ".format(minutes);
  if (seconds > 0)
    remainingTime += "%ds ".format(seconds);

  return StringUtils.trim(remainingTime);
}

export function commaFormat(n: number | string): string {
  let formatted = tostring(n);
  const parts: string[] = [];

  while (formatted.size() > 3) {
    parts.insert(0, formatted.sub(-3));
    formatted = formatted.sub(1, -4);
  }

  parts.insert(0, formatted);
  return parts.join(",");
}

const suffixes = <const>["K", "M", "B", "T", "Q"];
export function toSuffixedNumber(n: number): string {
  if (n < 100_000)
    return commaFormat(n);
  
  const index = floor(log(n, 1e3)) - 1;
  const divisor = 10 ** ((index + 1) * 3);
  const [ baseNumber ] = "%.1f".format(floor(n / divisor)).gsub("%.?0+$", "");
  return baseNumber + (index < 0 ? "" : suffixes[index]);
}

export function parseSuffixedNumber(suffixed: string): number {
  const match = suffixed.gsub(",", "")[0].match("^([0-9,.]+)([KMBT]?)$");
  if (!match)
    throw new Exception("InvalidSuffixedNumber", "Invalid suffixed number format");

  let numberPart = tostring(match[0]);
  const suffix = tostring(match[1]);

  if (suffix && suffix !== "" && suffix !== "nil") {
    const index = (<readonly string[]>suffixes).indexOf(suffix.lower());
    if (index === -1)
      throw new Exception("InvalidNumberSuffix", "Invalid suffix in suffixed number");

    const multiplier = 10 ** ((index + 1) * 3);
    numberPart = tostring(tonumber(numberPart)! * multiplier);
  }

  return tonumber(numberPart)!;
}