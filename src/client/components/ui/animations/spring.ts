import { OnStart } from "@flamework/core";
import { Component } from "@flamework/components";
import { TweenInfoBuilder } from "@rbxts/builders";

import { tween } from "shared/util";
import AnimationComponent from "client/base-components/animation-component";

const { EasingStyle } = Enum;

@Component({ tag: "SpringAnimation" })
export class SpringAnimation extends AnimationComponent implements OnStart {
  private readonly scale = new Instance("UIScale", this.instance);
  private readonly scaleIncrement = 0.05;
  
  protected readonly tweenInfo = new TweenInfoBuilder()
    .SetEasingStyle(EasingStyle.Elastic)
    .SetTime(0.35);

  public onStart(): void {
    this.connectEvents();
  }

  protected inactive(): void {
    tween(this.scale, this.tweenInfo, {
      Scale: 1
    });
  }

  protected active(): void {
    tween(this.scale, this.tweenInfo, {
      Scale: 1 + this.scaleIncrement
    });
  }
}