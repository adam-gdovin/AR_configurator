class ARError extends Error{};

type NullableVec3 = pc.Vec3 | null;

class SceneManager{
    private static _instance: SceneManager;

    public rotators: Set<Rotate> = new Set<Rotate>;
    public camera: pc.CameraComponent;
    public UI: UI;
    public UI_AR: pc.Entity;
    public sceneCollection: pc.Entity;

    private _ARposition: NullableVec3 = null;

    public get ARPosition(){
        return this._ARposition;
    }
    public set ARPosition(value: NullableVec3){
        this._ARposition = value;
        this.sceneCollection.enabled = true;
        this.sceneCollection.setPosition(value as pc.Vec3);
    }

    private constructor(){
        let root = pc.app.root.root as pc.Entity;
        this.sceneCollection = root.findByName("_Scene") as pc.Entity;
        this.camera = (root.findComponents("camera") as Array<pc.CameraComponent>)[0];
        this.UI = ((root.findByName("UI") as pc.Entity).script as any).ui;
        this.UI_AR = root.findByName("UI_AR") as pc.Entity;

        if(pc.app.xr.supported && pc.app.xr.isAvailable(pc.XRTYPE_AR)){
            pc.app.xr.on("start", this.setARScene, this);
            pc.app.xr.on("end", this.setBrowserScene, this);
        }
    }

    public static get instance(){
        if(!SceneManager._instance)
            SceneManager._instance = new SceneManager();
        return SceneManager._instance;
    }

    public startAR(){
        if(!pc.app.xr.supported)
            throw new ARError("XR not supported");
        if(!pc.app.xr.isAvailable(pc.XRTYPE_AR))
            throw new ARError("AR not available");
        pc.app.xr.start(this.camera, pc.XRTYPE_AR, pc.XRSPACE_LOCALFLOOR);
    }
    public endAR(){
        if(pc.app.xr.active)
            pc.app.xr.end();
    }
    
    public setARScene(){
        if(this.ARPosition == null)
            this.sceneCollection.enabled = false;
        else{
            this.sceneCollection.enabled = true;
            this.sceneCollection.setPosition(this.ARPosition);
        }
        this.UI.entity.enabled = false;
        this.UI_AR.enabled = true;
    }

    public setBrowserScene(){
        this.sceneCollection.enabled = true;
        this.sceneCollection.setPosition(0,0,0);
        this.UI.entity.enabled = true;
        this.UI_AR.enabled = false;
    }
}