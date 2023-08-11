import { Networking } from "@flamework/networking";
import { BuildingInfo, DataKey, DataValue } from "./data-models";
import { BuildingCategory } from "./util";

interface ServerEvents {
  buildingsLoaded(): void;
  initializeData(): void;
  dataLoaded(): void;
  setData(key: DataKey, value: DataValue): void;
  placeBuilding(buildingName: string, category: BuildingCategory, position: Vector3): void;
  updateTimerUIs(): void;
}

interface ClientEvents {
  dataUpdate(key: DataKey, value: DataValue): void;
}

interface ServerFunctions {
  getData(key: DataKey): DataValue;
  findBuilding(id: string): Maybe<BuildingInfo>;
  isTimerActive(buildingID: string): boolean;
}

interface ClientFunctions {}

export const GlobalEvents = Networking.createEvent<ServerEvents, ClientEvents>();
export const GlobalFunctions = Networking.createFunction<ServerFunctions, ClientFunctions>();
