import { Networking } from "@flamework/networking";
import { DataKey, DataValue } from "./data-models/generic";
import { Egg } from "./data-models/inventory";
import { DragonInfo } from "./data-models/dragons";
import { Building } from "./data-models/buildings";
import { Placable } from "./util";
import { TimerInfo } from "./data-models/time";

interface ServerEvents {
  initializeData(): void;
  dataLoaded(): void;
  setData(key: DataKey, value: DataValue): void;

  placeBuilding(buildingName: string, category: Placable, position: Vector3, idOverride?: string): void;
  placeDragon(dragonData: DragonInfo, habitatID: string): void;
  updateTimers(): void;

  addEggToHatchery(egg: Egg, isLoaded?: boolean): void;
  removeEggFromHatchery(eggID: string): void;
}

interface ClientEvents {
  dataUpdate(key: DataKey, value: DataValue): void;
  buildingsLoaded(buildings: Building[]): void;
  timerFinished(timer: TimerInfo): void;
  addNotificationToButton(buttonName: string): void;
}

interface ServerFunctions {
  getData(key: DataKey): DataValue;
  findBuilding(id: string): Maybe<Building>;
  isTimerActive(buildingID: string): boolean;
}

interface ClientFunctions {}

export const GlobalEvents = Networking.createEvent<ServerEvents, ClientEvents>();
export const GlobalFunctions = Networking.createFunction<ServerFunctions, ClientFunctions>();
