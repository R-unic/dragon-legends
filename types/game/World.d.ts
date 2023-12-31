interface Island extends Part {
  Grid: Texture;
}

interface Workspace extends WorldRoot {
	Camera: Camera;
	ViewportCamera: Part;
	Ignore: Folder & {
		CameraBounds: Part;
		PlayerCamera: Part;
	};
	SpawnLocation: SpawnLocation & {
		Decal: Decal;
	};
	Buildings: Folder;
	Islands: Folder & {
		Main: Island;
	};
}
