class MouseInput extends pc.ScriptType{
    public entity: pc.Entity;
    public orbitSensitivity: number;
    public distanceSensitivity: number;
    
    private orbitCamera: OrbitCamera;
    
    private fromWorldPoint: pc.Vec3 = new pc.Vec3();
    private toWorldPoint: pc.Vec3 = new pc.Vec3();
    private worldDiff: pc.Vec3 = new pc.Vec3();
    private lookButtonDown: boolean = false;
    private spinButtonDown: boolean = false;
    private lastPoint: pc.Vec2 = new pc.Vec2();

    public initialize() {
        this.orbitCamera = (this.entity.script as any).orbitCamera as OrbitCamera;

        if (this.orbitCamera) {            
            var onMouseOut = (e: MouseEvent) => {
                this.onMouseOut(e);
            };
            
            this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
            this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
            this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
            this.app.mouse.on(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);

            // Listen to when the mouse travels out of the window
            window.addEventListener("mouseout", onMouseOut, false);
            
            // Remove the listeners so if this entity is destroyed
            this.on("destroy", () => {
                this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
                this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
                this.app.mouse.off(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
                this.app.mouse.off(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);

                window.removeEventListener("mouseout", onMouseOut, false);
            });
        }
        
        // Disabling the context menu stops the browser displaying a menu when
        // you right-click the page
        this.app.mouse.disableContextMenu();
    }

    private onMouseDown(event: pc.MouseEvent) {
        switch (event.button) {
            case pc.MOUSEBUTTON_LEFT: {
                this.lookButtonDown = true;
            } break;
                
            case pc.MOUSEBUTTON_MIDDLE: 
            case pc.MOUSEBUTTON_RIGHT: {
                this.spinButtonDown = true;
            } break;
        }
    }
    
    private onMouseUp(event: pc.MouseEvent) {
        switch (event.button) {
            case pc.MOUSEBUTTON_LEFT: {
                this.lookButtonDown = false;
            } break;
                
            case pc.MOUSEBUTTON_MIDDLE: 
            case pc.MOUSEBUTTON_RIGHT: {
                this.spinButtonDown = false;            
            } break;
        }
    }
    
    private onMouseMove(event: pc.MouseEvent) {    
        if (this.lookButtonDown) {
            this.orbitCamera.pitch -= event.dy * this.orbitSensitivity;
            this.orbitCamera.yaw -= event.dx * this.orbitSensitivity;
            
        } else if (this.spinButtonDown) {
            SceneManager.instance.rotators.forEach(rot => {
                rot.angle += event.dx * rot.spinSensitivity;
            });
            this.orbitCamera.pitch -= event.dy * this.orbitSensitivity;
        }
        
        this.lastPoint.set(event.x, event.y);
    }
    
    private onMouseWheel(event: pc.MouseEvent) {
        this.orbitCamera.distance += event.wheelDelta * this.distanceSensitivity * (this.orbitCamera.distance * 0.1);
        event.event.preventDefault();
    }
    
    private onMouseOut(event: MouseEvent) {
        this.lookButtonDown = false;
        this.spinButtonDown = false;
    }
};

pc.registerScript(MouseInput, "mouseInput");

MouseInput.attributes.add("orbitSensitivity", {
    type: "number", 
    default: 0.3, 
    title: "Orbit Sensitivity", 
    description: "How fast the camera moves around the orbit. Higher is faster"
});

MouseInput.attributes.add("distanceSensitivity", {
    type: "number", 
    default: 0.15, 
    title: "Distance Sensitivity", 
    description: "How fast the camera moves in and out. Higher is faster"
});