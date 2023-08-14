import { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import { Janitor } from "@rbxts/janitor";

import { DragonPlacementController } from "client/controllers/dragon-placement-controller";

import { DataKey } from "shared/data-models/generic";
import { Building, Buildings, Habitat, Hatchery } from "shared/data-models/buildings";
import { MissingBuildingException } from "shared/exceptions";
import { Assets, newDragonModel, newEggMesh, toSuffixedNumber } from "shared/util";
import { DataLinked } from "client/hooks";
import { Events, Functions } from "client/network";

const { timerFinished, removeEggFromHatchery } = Events;
const { getBuildingData: findBuilding, isTimerActive } = Functions;
const { isUpgradable, isHabitat, isHatchery } = Buildings;

interface Attributes {
  ID?: string;
}

interface BuildingSelectFrame extends Frame {
  BuildingTitle: TextLabel;
  BottomRight: Frame & {
    Info: ImageButton;
    Move: ImageButton;
    Upgrade: ImageButton;
    CollectGold: ImageButton & {
      Amount: TextLabel;
    };
  };
}

@Component({ tag: "BuildingSelectPage" })
export class BuildingSelectPage extends BaseComponent<Attributes, BuildingSelectFrame> implements OnStart, DataLinked {
  private readonly buttons = this.instance.BottomRight;
  private dragonButtonDebounce = false;
  private eggButtonDebounce = false;

  public constructor(
    private readonly dragon: DragonPlacementController
  ) { super(); }
  
  public onStart(): void {
    this.maid.GiveTask(
      this.instance.GetAttributeChangedSignal("ID")
        .Connect(async () => {
          this.updatePage();  
        })
    );
  }

  public async onDataUpdate(key: DataKey): Promise<void> {
    if (key !== "buildings") return;
    this.updatePage();
  }

  private async updatePage(): Promise<void> {
    if (!this.attributes.ID) return;

    const building = await this.getBuilding();
    if (!building)
      throw new MissingBuildingException(this.attributes.ID, "Failed to find building when updating BuildingSelectPage");

    this.updateTitle(building);
    this.updateButtons(building);
  }

  private async addEggButtons({ eggs }: Hatchery): Promise<void> {
    if (this.eggButtonDebounce) return;
    this.eggButtonDebounce = true;
    task.delay(1, () => this.eggButtonDebounce = false);

    const janitor = new Janitor;
    for (const egg of eggs) {
      const button = Assets.UI.HatcheryEggButton.Clone();
      newEggMesh(egg, {
        parent: button.Viewport
      });

      let eggTimerFinished = !await isTimerActive(egg.id);
      button.Parent = this.buttons;
      button.Place.Visible = eggTimerFinished;
      button.SetAttribute("EggID", egg.id);

      janitor.LinkToInstance(button, true);
      janitor.Add(button.MouseButton1Click.Connect(async () => {
        if (!eggTimerFinished) return;
        const [ dragonName ] = egg.name.gsub(" Egg", "");
        const placed = await this.dragon.place(dragonName);
        if (placed) {
          removeEggFromHatchery(egg.id);
          button.Destroy();
        }
      }));

      janitor.Add(timerFinished.connect(timer => {
        if (timer.id !== egg.id) return;
        eggTimerFinished = true;
        button.Place.Visible = true;
      }));
    }
  }

  private addDragonButtons({ dragons }: Habitat): void {
    if (this.dragonButtonDebounce) return;
    this.dragonButtonDebounce = true;
    task.delay(1.5, () => this.dragonButtonDebounce = false);

    const janitor = new Janitor;
    for (const dragon of dragons) {
      const button = Assets.UI.HabitatDragonButton.Clone();
      newDragonModel(dragon.name, {
        parent: button.Viewport
      });

      // button.Boost
      button.DragonName.Text = dragon.name;
      button.Parent = this.buttons;
      button.SetAttribute("DragonID", dragon.id);

      janitor.LinkToInstance(button, true);
      janitor.Add(button.MouseButton1Click.Connect(() => {
        // display dragon stats stats page (or something lmao)
      }));
    }
  }

  private updateButtons(building: Building) {
    this.buttons.CollectGold.Visible = isHabitat(building);
    this.buttons.Upgrade.Visible = isUpgradable(building);

    this.removeExtraButtons();
    if (isHabitat(building)) {
      this.buttons.CollectGold.Amount.Text = toSuffixedNumber(building.gold);
      this.addDragonButtons(building);
    } else if (isHatchery(building))
      this.addEggButtons(building);

  }

  private removeExtraButtons(): void {
    for (const button of this.buttons.GetChildren())
      if (button.GetAttribute("DragonID")) {
        if (this.dragonButtonDebounce) return;
        button.Destroy();
      } else if (button.GetAttribute("EggID")) {
        if (this.eggButtonDebounce) return;
        button.Destroy();
      }
  }

  private updateTitle(building: Building): void {
    const level = isUpgradable(building) ? building.level : undefined;
    this.instance.BuildingTitle.Text = building.name + (level ? ` (level ${level})` : "");
  }

  private async getBuilding(): Promise<Maybe<Building>> {
    return findBuilding(this.attributes.ID!);
  }
}