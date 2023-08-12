import { Dependency, OnStart, Service } from "@flamework/core";
import Signal from "@rbxts/signal";

import { DataService } from "./data-service";
import { Building, Buildings } from "shared/data-models";
import { Assets, getDragonData, toUsableVector3 } from "shared/util";
import { Events } from "server/network";

const { dataLoaded, placeBuilding, placeDragon } = Events;
const { isHabitat } = Buildings;

@Service()
export class BuildingLoaderService implements OnStart {
  public readonly onBuildingsLoaded = new Signal<(player: Player) => void>();
  
  private readonly data = Dependency<DataService>();

  public onStart(): void {
    dataLoaded.connect(player => {
      const buildings = this.data.get<Building[]>(player, "buildings");
      for (const building of buildings)
        this.loadBuilding(player, building);

      this.onBuildingsLoaded.Fire(player);
    });
  }

  private loadBuilding(player: Player, building: Building): void {
    let category: Exclude<keyof typeof Assets, keyof Folder | "UI">;
    if (isHabitat(building)) {
      category = "Habitats";
      for (const dragon of building.dragons) {
        const dragonModel = <Model>Assets.Dragons.WaitForChild(dragon.name);
        const dragonData = getDragonData(dragonModel);
        placeDragon.predict(player, dragonData, building.id);
      }
    } else
      category = "Buildings";

    placeBuilding.predict(player, building.name, category, toUsableVector3(building.position), building.id)
  }
}