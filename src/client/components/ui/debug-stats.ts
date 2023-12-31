import { OnStart } from "@flamework/core";
import { Component, BaseComponent } from "@flamework/components";
import { RunService as Runtime, Stats } from "@rbxts/services";
import Object from "@rbxts/object-utils";
import StringUtils from "@rbxts/string-utils";

import { SelectionController } from "client/controllers/selection-controller";

import { toSuffixedNumber } from "shared/utilities/helpers";
import Log from "shared/logger";
import repr from "shared/repr";

import { DebugStatsScreen } from "client/ui-types";
import RoFraps from "client/classes/rofraps";

const { floor, ceil } = math;

@Component({ tag: "DebugStats" })
export class DebugStats extends BaseComponent<{}, DebugStatsScreen> implements OnStart {
  private readonly rofraps = new RoFraps(0.25);

  public constructor(
    private readonly selection: SelectionController
  ) { super(); }

  public onStart(): void {
    Log.info("Displaying debug stats");

    this.instance.Enabled = Runtime.IsStudio();
    this.maid.GiveTask(this.instance.Stats.ViewInfo.MouseButton1Click.Connect(async () => {
      const selectedBuilding = await this.selection.getSelectedBuilding();
      if (!selectedBuilding) return;
      if (this.instance.Info.Visible)
        return this.instance.Info.Visible = false;

      this.instance.Info.Visible = true;
    }));

    this.maid.GiveTask(this.selection.onSelectionChanged.Connect(async () => {
      const selectedBuilding = await this.selection.getSelectedBuilding();
      this.instance.Stats.ViewInfo.Visible = selectedBuilding !== undefined;
      if (this.instance.Info.Visible && !selectedBuilding)
        this.instance.Info.Visible = false;

      if (!selectedBuilding) return;
      this.updateInfoFrame(selectedBuilding);
    }));

    this.rofraps.Start();
    this.maid.GiveTask(this.rofraps.DataUpdated.Connect(() => this.updateStatsFrame()));
    this.maid.GiveTask(this.rofraps);
  }

  private updateInfoFrame(info: Record<string, unknown>): void {
    const infoLabels = this.instance.Info.GetChildren()
      .filter(i => i.IsA("TextLabel"));

    for (const label of infoLabels)
      task.spawn(() => label.Destroy());

    let order = 1;
    for (const [key, value] of Object.entries(info))
      task.spawn(() => {
        this.addInfoPropertyLabel(value, key, order);
        order++;
      });
  }

  private updateStatsFrame(): void {
    const stats = this.instance.Stats;
    stats.MemoryUsage.Text = `MemoryUsage: ${toSuffixedNumber(floor(Stats.GetTotalMemoryUsageMb()))} MB`;
    stats.Incoming.Text = `NetworkIncoming: ${floor(Stats.DataReceiveKbps)} kb/s`;
    stats.Outgoing.Text = `NetworkOutgoing: ${floor(Stats.DataSendKbps)} kb/s`;
    stats.Instances.Text = "Instances: " + toSuffixedNumber(Stats.InstanceCount);
    stats.FPS.Text = "FPS: " + floor(this.rofraps.Framerate);
    stats.AverageFPS.Text = "Average FPS: " + floor(this.rofraps.FramerateAverage);
    stats["1PercentLowFPS"].Text = "1% Low FPS: " + floor(this.rofraps.OnePercentLow);
    stats["0.1PercentLowFPS"].Text = "0.1% Low FPS: " + ceil(this.rofraps.PointOnePercentLow);
  }

  private addInfoPropertyLabel(value: defined, key: string, layoutOrder: number) {
    const property = new Instance("TextLabel");
    property.BackgroundTransparency = 1;
    property.Name = "PropertyLabel";
    property.RichText = true;
    property.TextScaled = true;
    property.FontFace = new Font("rbxasset://fonts/families/Ubuntu.json", Enum.FontWeight.Medium, Enum.FontStyle.Normal);
    property.TextColor3 = Color3.fromRGB(188, 226, 255);
    property.TextXAlignment = Enum.TextXAlignment.Left;
    property.TextYAlignment = Enum.TextYAlignment.Top;

    property.GetPropertyChangedSignal("TextBounds")
      .Connect(() => {
        const lines = floor(property.TextBounds.X / 390) + property.Text.split("\n").size();
        property.Size = UDim2.fromScale(1, 0.05 * lines);
      });

    property.Text = `${key}: ${this.color(value)}`;
    property.LayoutOrder = layoutOrder;
    property.Parent = this.instance.Info;
  }

  private color(value: unknown, indent = 0): string {
    let text = this.getPrettyValue(value, indent);
    const isID = text.size() === 40 &&
      StringUtils.startsWith(text, "\"{") &&
      StringUtils.endsWith(text, "}\"");

    if (isID)
      text = text.sub(3, -3);

    const color = this.getTypeColor(value, isID);
    return color ? `<font color="#${color}">${text}</font>` : text;
  }

  private getPrettyValue(value: unknown, indent = 0): string {
    if (typeOf(value) === "table") {
      // let lbracket = "{", rbracket = "}";
      // let newlines = true;
      // const tab = (offset = 0) => "\t".rep(indent + offset);
      // const entries = Object.entries(<Record<string | number, unknown>>value);
      // const contents = entries
      //   .sort(([ka], [kb]) => typeOf(ka) === "number" ? <number>ka < <number>kb : <string>ka > <string>kb)
      //   .map(([k, v]) => {
      //     if (typeOf(k) === "number") {
      //       lbracket = "[";
      //       rbracket = "]";
      //       newlines = false;
      //     }

      //     const field = (newlines ? tab(1) : "") + `${typeOf(k) === "string" ? k + ": " : ""}${this.color(v, indent)}`;
      //     if (typeOf(v) === "table")
      //       indent += 1;

      //     return field;
      //   })
      //   .join("," + (newlines ? "\n" : ""));

      // const newline = newlines ? "\n" : "";
      // if (entries.size() === 0) return "[]";
      // return `${lbracket}${newline}${contents}${newline + (newlines ? tab(-1) : "")}${rbracket}`;
      return "{ ... }"
    }

    return tostring(repr(value, {
      pretty: true,
      sortKeys: true
    }));
  }

  private getTypeColor(value: unknown, isID = false): Maybe<string> {
    if (isID)
      return "aa55ff";

    switch (typeOf(value)) {
      case "EnumItem":
        return "00aaff";
      case "string":
        return "55ff7f";
      case "number":
        return "ff5500";
      case "boolean":
        return "fff04a";
      case "nil":
        return "db5433";
    }
  }
}