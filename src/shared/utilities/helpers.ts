import { Players, ReplicatedFirst, Workspace as World, MarketplaceService as Marketplace } from "@rbxts/services";
import StringUtils from "@rbxts/string-utils";
import Object from "@rbxts/object-utils";

import { StorableVector3 } from "../data-models/utility";
import { DragonInfo } from "../data-models/dragons";
import { Egg } from "../data-models/inventory";
import { Exception } from "../exceptions";

const { floor, log, round, abs, huge: inf } = math;

export type Placable = "Decor" | "Buildings" | "Habitats" | "Dragons";

export const Assets = ReplicatedFirst.Assets;
export const Player = Players.LocalPlayer;

export const now = () => round(tick());
export const toStorableVector3 = ({ X, Y, Z }: Vector3) => ({ x: X, y: Y, z: Z })
export const toUsableVector3 = ({ x, y, z }: StorableVector3) => new Vector3(x, y, z);

export interface DevProductInfo {
  Description: string;
  PriceInRobux: number;
  ProductId: number;
  IconImageAssetId: number;
  Name: string;
}

export function getDevProducts(): DevProductInfo[] {
  return getPageContents(Marketplace.GetDeveloperProductsAsync());
}

export function getPageContents<T extends defined>(pageManager: Pages<T>): T[] {
  const contents: T[] = [];
  while (!pageManager.IsFinished) {
    const page = pageManager.GetCurrentPage();
    for (const item of page)
      contents.push(item);

    pageManager.AdvanceToNextPageAsync();
  }

  return contents;
}

export function toNearestFiveOrTen(n: number): number {
  let result = floor(n / 5 + 0.5) * 5;
  if (result % 10 !== 0)
    result += 10 - result % 10;

  return result;
}

export function newDragonModel(name: string, options?: {
  position?: Vector3;
  parent?: Instance;
  attributes?: Record<string, AttributeValue>;
}): Model {

  const dragonModel = <Model>Assets.Dragons.WaitForChild(name).Clone();
  dragonModel.PrimaryPart!.Position = options?.position?.add(new Vector3(0, dragonModel.PrimaryPart!.Size.Y / 2, 0)) ?? new Vector3;

  if (options?.parent)
    dragonModel.Parent = options.parent;

  return dragonModel;
}

export function newEggMesh(egg: Egg, options?: {
  position?: Vector3;
  parent?: Instance;
  attributes?: Record<string, AttributeValue>;
}): MeshPart {

  const eggMesh = <MeshPart>Assets.Eggs.WaitForChild(egg.name).Clone();
  eggMesh.Position = options?.position ?? new Vector3;

  if (options?.attributes)
    for (const [name, value] of Object.entries(options.attributes))
      eggMesh.SetAttribute(name, value);

  if (options?.parent)
    eggMesh.Parent = options.parent;

  return eggMesh;
}

export function getPlacedBuilding<T extends Model = Model>(id: string): T extends HatcheryModel ? T : Maybe<T> {
  return <T extends HatcheryModel ? T : Maybe<T>>World.Buildings.GetChildren()
    .find(b => b.GetAttribute<string>("ID") === id);
}

export function getStaticDragonInfo(dragonModel: Model): DragonInfo {
  const dataModule = <ModuleScript>dragonModel.WaitForChild("Data");
  return <DragonInfo>require(dataModule);
}

export function toRegion3({ CFrame, Size }: Part, areaShrink = 0): Region3 {
  const { X: sx, Y: sy, Z: sz } = Size;
  const [x, y, z, r00, r01, r02, r10, r11, r12, r20, r21, r22] = CFrame.GetComponents();
  const wsx = 0.5 * (abs(r00) * sx + abs(r01) * sy + abs(r02) * sz);
  const wsy = 0.5 * (abs(r10) * sx + abs(r11) * sy + abs(r12) * sz);
  const wsz = 0.5 * (abs(r20) * sx + abs(r21) * sy + abs(r22) * sz);
  return new Region3(
    new Vector3(x - wsx + areaShrink, y - wsy, z - wsz + areaShrink),
    new Vector3(x + wsx - areaShrink, y + wsy, z + wsz - areaShrink)
  );
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
  if (tonumber(n)! >= inf)
    return "Infinity";
  if (tonumber(n)! <= -inf)
    return "-Infinity";

  let formatted = tostring(n);
  const parts: string[] = [];

  while (formatted.size() > 3) {
    parts.insert(0, formatted.sub(-3));
    formatted = formatted.sub(1, -4);
  }

  parts.insert(0, formatted);
  return parts.join(",");
}

const suffixes = <const>["K", "M", "B", "T", "Q", "QN", "SX", "SP", "O", "N", "D", "UD", "DD", "TD", "QD", "QND", "SXD", "SPD", "OD", "ND", "VG"];
export function toSuffixedNumber(n: number): string {
  if (n < 100_000 || n >= inf || n <= -inf)
    return commaFormat(n);

  const index = floor(log(n, 1e3)) - 1;
  const divisor = 10 ** ((index + 1) * 3);
  const [baseNumber] = "%.1f".format(floor(n / divisor)).gsub("%.?0+$", "");
  return baseNumber + (index < 0 ? "" : suffixes[index]);
}

export function parseSuffixedNumber(suffixed: string): Maybe<number> {
  const match = suffixed.gsub(",", "")[0].match("^([0-9.]+)([KMBT]?)$");
  if (!match)
    throw new Exception("InvalidSuffixedNumber", "Invalid suffixed number format");

  let numberPart = tostring(match[0]);
  const suffix = tostring(match[1]);

  if (suffix && suffix !== "" && suffix !== "nil") {
    const index = (<readonly string[]>suffixes).indexOf(suffix);
    if (index === -1)
      throw new Exception("InvalidNumberSuffix", "Invalid suffix in suffixed number");

    const multiplier = 10 ** ((index + 1) * 3);
    numberPart = tostring(tonumber(numberPart)! * multiplier);
  }

  return tonumber(numberPart)!;
}