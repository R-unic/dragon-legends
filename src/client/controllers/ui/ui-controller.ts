import { Controller } from "@flamework/core";
import { CollectionService as Collection } from "@rbxts/services";
import Object from "@rbxts/object-utils";

import { PlayerController } from "../player-controller";

@Controller()
export class UIController {
  public current = "Main";
  public currentPage = "Main";

  public constructor(
    private readonly player: PlayerController
  ) { }

  public open(name: string): void {
    const guis = <ScreenGui[]>this.player.gui.GetChildren();
    this.current = name;

    for (const gui of guis)
      if (!Collection.HasTag(gui, "OverlayScreen")) {
        const on = gui.Name === name;
        gui.Enabled = on;

        if (on) {
          const mainPage = gui.GetAttribute<Maybe<string>>("MainPage") ?? "Main";
          this.setPage(gui.Name, mainPage);
        }
      }
  }

  public setScreenState(guiName: string, state: Record<string, AttributeValue>): void {
    const screen = this.getScreen(guiName);
    for (const [key, value] of Object.entries(state))
      screen.SetAttribute(key, value);
  }

  public getScreenState(guiName: string): Map<string, AttributeValue> {
    return this.getScreen(guiName).GetAttributes();
  }

  public getPage<T extends GuiObject = GuiObject>(guiName: string, pageName: string): T {
    const gui = this.getScreen(guiName);
    return <T>(<GuiObject[]>gui.GetChildren()
      .filter(e => Collection.HasTag(e, "Page")))
      .find(page => page.Name === pageName)!;
  }

  public setPage(guiName: string, pageName: string): GuiObject {
    const gui = this.getScreen(guiName);
    const pages = <GuiObject[]>gui.GetChildren()
      .filter(e => Collection.HasTag(e, "Page"));

    for (const page of pages) {
      const on = page.Name === pageName;
      page.Visible = on;
      if (on)
        this.currentPage = page.Name;
    }

    return pages.find(page => page.Name === pageName)!;
  }

  public getScreen<Children extends {} = {}>(searchParameter: GuiBase | string): ScreenGui & Children {
    if (typeOf(searchParameter) === "Instance")
      return <ScreenGui & Children>(<GuiBase>searchParameter).FindFirstAncestorOfClass("ScreenGui")!;
    else
      return <ScreenGui & Children>this.player.gui.WaitForChild(<string>searchParameter);
  }
}