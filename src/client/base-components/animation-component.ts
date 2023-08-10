import { BaseComponent } from "@flamework/components";
import { OnStart } from "@flamework/core";
import { TweenInfoBuilder } from "@rbxts/builders";

interface Attributes {
  Hover?: boolean;
  Click?: boolean;
}

export default abstract class AnimationComponent<
  A extends object = {},
  I extends GuiButton = GuiButton
> extends BaseComponent<Attributes & A, I>
  implements OnStart {

  protected readonly abstract tweenInfo: TweenInfoBuilder
  protected readonly includeClick: boolean = true

  protected abstract active(): void;
  protected abstract inactive(): void;

  public onStart(): void {
    this.instance.MouseEnter.Connect(() => this.active());
    this.instance.MouseLeave.Connect(() => this.inactive());
    if (this.includeClick) {
      this.instance.MouseButton1Down.Connect(() => this.inactive());
      this.instance.MouseButton1Up.Connect(() => this.active());
    }
  }
}