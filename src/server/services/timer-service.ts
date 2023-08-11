import { Service, Dependency, OnInit } from "@flamework/core";
import { Components } from "@flamework/components";
import { Workspace as World } from "@rbxts/services";
import { BuildingTimer, TimeInfo } from "shared/data-models";
import { now } from "shared/util";

import { DataService } from "./data-service";
import { BuildingLoaderService } from "./building-loader-service";
import { Timer } from "server/components/timer";
import { Events, Functions } from "server/network";

@Service()
export class TimerService implements OnInit {
  private readonly data = Dependency<DataService>();
  private readonly buildingLoader = Dependency<BuildingLoaderService>();
  private readonly components = Dependency<Components>();

  public onInit(): void {
    this.buildingLoader.onBuildingsLoaded.Connect((player) => this.updateTimers(player));
    Events.updateTimerUIs.connect((player) => this.updateTimers(player))
    Functions.isTimerActive.setCallback((player, id) => this.isTimerActive(player, id));
  }

  public isTimerActive(player: Player, buildingID: string): boolean {
    const { timers } = this.data.get<TimeInfo>(player, "timeInfo");
    return timers.find(timer => timer.buildingID === buildingID) !== undefined;
  }

  private async updateTimers(player: Player): Promise<void> {
    const { timers } = this.data.get<TimeInfo>(player, "timeInfo");
    print(timers)
    for (const timer of timers) {
      const building = World.Buildings.GetChildren()
        .find((building): building is Model => building.GetAttribute<string>("ID") === timer.buildingID);

      if (!building)
        return warn("Could not find building associated with timer. ID " + timer.buildingID);

      const completionTime = timer.beganAt + timer.length;
      if (now() >= completionTime) {
        this.removeTimer(player, timer.buildingID);
        if (!this.components.getComponent<Timer>(building)) return;
        this.components.removeComponent<Timer>(building);
      } else {
        if (this.components.getComponent<Timer>(building)) return;
        this.components.addComponent<Timer>(building);
      }
    }
  }

  public removeTimer(player: Player, id: string): void {
    const timeInfo = this.data.get<TimeInfo>(player, "timeInfo");
    timeInfo.timers = timeInfo.timers.filter(timer => timer.buildingID !== id);
    this.data.set(player, "timeInfo", timeInfo);
  }

  public addBuildingTimer(player: Player, id: string, length: number): void {
    const timeInfo = this.data.get<TimeInfo>(player, "timeInfo");
    const timer: BuildingTimer = {
      buildingID: id,
      beganAt: now(),
      length
    };

    timeInfo.timers = [ ...timeInfo.timers, timer ];
    this.data.set(player, "timeInfo", timeInfo);
    this.updateTimers(player);
  }
}