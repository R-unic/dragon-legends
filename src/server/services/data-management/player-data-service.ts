import { OnInit, Service } from "@flamework/core";
import DataStore2 from "@rbxts/datastore2";

import { DataKey, DataValue, DataKeys } from "shared/data-models/generic";
import { TimeInfo } from "shared/data-models/time";
import { Building, Hatchery } from "shared/data-models/buildings";
import { Assets, now, toStorableVector3 } from "shared/utilities/helpers";
import { OnPlayerLeave } from "server/hooks";
import { Events, Functions } from "server/network";
import Log from "shared/logger";

const { initializeData, setData, incrementData, dataLoaded, dataUpdate } = Events;
const { getData } = Functions;

@Service()
export class PlayerDataService implements OnInit, OnPlayerLeave {
	public onInit(): void {
		DataStore2.Combine("DATA", ...DataKeys);
		initializeData.connect((player) => this.setup(player));
		setData.connect((player, key, value) => this.set(player, key, value));
		incrementData.connect((player, key, amount) => this.increment(player, key, amount))
		getData.setCallback((player, key) => this.get(player, key));
	}

	public onPlayerLeave(player: Player): void {
		const timeInfo = this.get<TimeInfo>(player, "timeInfo");
		timeInfo.lastOnline = now();
		this.set(player, "timeInfo", timeInfo);
	}

	public increment(player: Player, key: DataKey, amount = 1): void {
		const value = this.get<number>(player, key);
		this.set(player, key, value + amount);
	}

	public get<T extends DataValue = DataValue>(player: Player, key: DataKey): T {
		const store = this.getStore<T>(player, key);
		return store.Get()!;
	}

	public set<T extends DataValue = DataValue>(player: Player, key: DataKey, value: T): void {
		const store = this.getStore<T>(player, key);
		store.Set(value);
	}

	private setup(player: Player): void {
		this.initialize(player, "gold", 250);
		this.initialize(player, "diamonds", 5);
		this.initialize(player, "food", 20);
		this.initialize(player, "level", 1);
		this.initialize(player, "xp", 0);

		this.initialize(player, "inventory", []);
		this.initialize(player, "dragons", []);
		this.initialize<TimeInfo>(player, "timeInfo", {
			timers: []
		});

		this.initialize<Building[]>(player, "buildings", [
			<Hatchery>{
				id: "HATCHERY",
				name: "Hatchery",
				position: toStorableVector3(Assets.Buildings.Hatchery.PrimaryPart!.Position),
				level: 1,
				eggs: []
			}
		]);

		Log.info("Initialized data");
		dataLoaded.predict(player);
	}

	private initialize<T extends DataValue = DataValue>(
		player: Player,
		key: DataKey,
		defaultValue: T
	): void {

		task.spawn(() => {
			const store = this.getStore(player, key);
			const value = store.Get(defaultValue);
			this.sendToClient(player, key, value);
			store.OnUpdate((value) => this.sendToClient(player, key, value));
		});
	}

	private sendToClient<T extends DataValue = DataValue>(
		player: Player,
		key: DataKey,
		value: T
	): void {

		dataUpdate(player, key, value);
	}

	private getStore<T extends DataValue = DataValue>(player: Player, key: DataKey): DataStore2<T> {
		return DataStore2<T>("TEST18_" + key, player);
	}
}