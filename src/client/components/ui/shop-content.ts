import { Dependency, OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import { PlacementController } from "client/controllers/placement-controller";
import { UIController } from "client/controllers/ui-controller";
import { Assets, BuildingCategory, suffixedNumber } from "shared/util";
import { Functions } from "client/network";

interface Attributes {}

@Component({ tag: "ShopContent" })
export class ShopContent extends BaseComponent<Attributes, ScrollingFrame> implements OnStart {
  private readonly placement = Dependency<PlacementController>();
  private readonly ui = Dependency<UIController>();

  public onStart(): void {
    const contentType = <BuildingCategory>this.instance.Parent?.Name!;
    const items = <Model[]>Assets.FindFirstChild(contentType)!.GetChildren();

    for (const item of items) {
      const card = Assets.UI.ItemCard.Clone();
      card.Title.Text = item.Name;

      const viewportModel = item.Clone();
      viewportModel.PrimaryPart!.Position = new Vector3;
      viewportModel.Parent = card.Viewport;

      const price = <number>item.GetAttribute("Price");
      card.Purchase.Container.Price.Text = suffixedNumber(price);

      let db = false
      card.Purchase.MouseButton1Click.Connect(async () => {
        if (db) return;
        db = true;
        task.delay(1, () => db = false);

        const gold = <number>await Functions.getData("gold");
        if (price > gold) return;
        this.placement.place(item.Name, contentType);
        this.ui.open("Main");
      });

      card.Parent = this.instance;
      this.maid.GiveTask(card);
    }
  }
}