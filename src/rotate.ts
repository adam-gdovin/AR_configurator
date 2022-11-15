class Rotate extends pc.ScriptType {
    public inertiaFactor: number;
    public targetEntity: pc.Entity;
    public spinSensitivity: number;

    // Property to get and set the angle of the entity around the pivot point (degrees)
    private _targetAngle: number = 0;
    private _angle: number = 0;
    private _rotQuat: pc.Quat = new pc.Quat();
    public get angle(){
        return this._targetAngle;
    }
    public set angle(value: number){
        this._targetAngle = value;

        // Ensure that the angle takes the shortest route by making sure that 
        // the difference between the targetangle and the actual is 180 degrees
        // in either direction
        /*var diff = this._targetAngle - this._angle;
        console.log(diff)
        var reminder = diff % 360;
        if (reminder > 180) {
            this._targetAngle = this._angle - (360 - reminder);
        } else if (reminder < -180) {
            this._targetAngle = this._angle + (360 + reminder);
        } else {
            this._targetAngle = this._angle + reminder;
        }*/
    }

    public initialize(){
        this._angle = this.entity.getLocalEulerAngles().y;
        this._rotQuat = this.entity.getLocalRotation().clone();
        SceneManager.instance.rotators.add(this);
        this.entity.on("destroy", ()=>{
            SceneManager.instance.rotators.delete(this);
        })
    }

    public update(dt: number) {
        // Add inertia, if any
        var t = this.inertiaFactor === 0 ? 1 : Math.min(dt / this.inertiaFactor, 1);
        this._angle = pc.math.lerp(this._angle, this._targetAngle, t);
        this._updatePosition();
    }


    private _updatePosition() {
        // Work out the camera position based on the pivot point, pitch, angle and distance
        var entity: pc.Entity = this.targetEntity || this.entity;
        entity.setLocalEulerAngles(0, this._angle, 0);
    }
};

pc.registerScript(Rotate, "rotate");

Rotate.attributes.add("spinSensitivity", {
    type: "number", 
    default: 0.3, 
    title: "Spin Sensitivity", 
    description: "How fast the entities spin. Higher is faster"
});

Rotate.attributes.add("inertiaFactor", {
    type: "number",
    default: 0,
    title: "Inertia Factor",
    description: "Higher value means that the entity will continue moving after the user has stopped dragging. 0 is fully responsive."
});

Rotate.attributes.add("targetEntity", {
    type: "entity",
    title: "Entity to spin",
    description: "Entity to rotate. If blank, then the script parent entity will be used"
});