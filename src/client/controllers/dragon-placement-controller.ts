import { Controller } from "@flamework/core";
import { Workspace as World } from "@rbxts/services";
import { Janitor } from "@rbxts/janitor";
import StringUtils from "@rbxts/string-utils";

import { UIController } from "./ui-controller";
import { MouseController } from "./mouse-controller";
import { NotificationController } from "./notification-controller";

import { Element } from "shared/data-models/dragons";
import { Habitat } from "shared/data-models/buildings";
import { NotificationType } from "shared/notification-type";
import { getDragonData, newDragonModel } from "shared/util";
import { Events, Functions } from "client/network";

const { placeDragon } = Events;
const { isTimerActive, getBuildingData } = Functions;

@Controller()
export class DragonPlacementController {
  private readonly janitor = new Janitor;
  
  public constructor(
    private readonly ui: UIController,
    private readonly mouse: MouseController,
    private readonly notification: NotificationController
  ) {}

  public async place(dragonName: string): Promise<boolean | void> {
    // TODO: check space left in habitat
    const dragonModel = newDragonModel(dragonName);
    const dragon = getDragonData(dragonModel);
    dragonModel.Destroy();

    const habitats = <HabitatModel[]>World.Buildings.GetChildren()
      .filter(b => StringUtils.endsWith(b.Name, "Habitat"));

    const usableHabitats: HabitatModel[] = [];
    for (const habitatModel of habitats) {
      const [ element ] = <[Element, string]>habitatModel.Name.split(" ");
      const id = habitatModel.GetAttribute<string>("ID");
      const habitat = <Habitat>await getBuildingData(id);
      
      const max = <HabitatMaximums>require(habitatModel.Maximums);
      const usable = dragon.elements.includes(element) && 
        !await isTimerActive(id) &&
        habitatModel.Dragons.GetChildren().size() < max.dragons[habitat.level - 1];

      habitatModel.Highlight.Enabled = usable;
      if (usable)
        usableHabitats.push(habitatModel);
    }

    if (usableHabitats.size() === 0)
      return this.notification.dispatch("Cannot place dragon, you own no usable habitats for this dragon.", NotificationType.Error);

    this.ui.setPage("Main", "None");
    this.janitor.Add(this.mouse.onClick(() => {
      const habitat = <Maybe<HabitatModel>>this.mouse.target()?.Parent;
      if (!habitat) return;
      if (!usableHabitats.includes(habitat)) return;

      const habitatID = habitat.GetAttribute<string>("ID");
      placeDragon(dragon, habitatID);
      this.janitor.Cleanup();
    }));

    this.janitor.Add(async () => {
      this.ui.setPage("Main", "Main");
      for (const habitat of habitats)
        habitat.Highlight.Enabled = false;
    });

    return true;
  }
}