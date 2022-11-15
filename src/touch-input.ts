class TouchInput extends pc.ScriptType{
    public entity: CameraEntity;
    public orbitSensitivity: number;
    public distanceSensitivity: number;
    
    private fromWorldPoint: pc.Vec3 = new pc.Vec3();
    private toWorldPoint: pc.Vec3 = new pc.Vec3();
    private worldDiff: pc.Vec3 = new pc.Vec3();
    private pinchMidPoint: pc.Vec2 = new pc.Vec2();
    private orbitCamera: OrbitCamera;
    private lastTouchPoint: pc.Vec2 = new pc.Vec2();
    private lastPinchMidPoint: pc.Vec2 = new pc.Vec2();
    private lastPinchDistance: number = 0;
    
    initialize(){
        this.orbitCamera = (this.entity.script as any).orbitCamera as OrbitCamera;

        var self: TouchInput = this;
        
        if (this.orbitCamera && this.app.touch) {
            // Use the same callback for the touchStart, touchEnd and touchCancel events as they 
            // all do the same thing which is to deal the possible multiple touches to the screen
            this.app.touch.on(pc.EVENT_TOUCHSTART, this.onTouchStartEndCancel, this);
            this.app.touch.on(pc.EVENT_TOUCHEND, this.onTouchStartEndCancel, this);
            this.app.touch.on(pc.EVENT_TOUCHCANCEL, this.onTouchStartEndCancel, this);
            
            this.app.touch.on(pc.EVENT_TOUCHMOVE, this.onTouchMove, this);
            
            this.on("destroy", function() {
                self.app.touch.off(pc.EVENT_TOUCHSTART, self.onTouchStartEndCancel, self);
                self.app.touch.off(pc.EVENT_TOUCHEND, self.onTouchStartEndCancel, self);
                self.app.touch.off(pc.EVENT_TOUCHCANCEL, self.onTouchStartEndCancel, self);
    
                self.app.touch.off(pc.EVENT_TOUCHMOVE, self.onTouchMove, self);
            });
        }
    }
    
    
    getPinchDistance(pointA: pc.Touch, pointB: pc.Touch) {
        // Return the distance between the two points
        var dx = pointA.x - pointB.x;
        var dy = pointA.y - pointB.y;    
        
        return Math.sqrt((dx * dx) + (dy * dy));
    }
    
    
    calcMidPoint(pointA: pc.Touch, pointB: pc.Touch, result: pc.Vec2) {
        result.set(pointB.x - pointA.x, pointB.y - pointA.y);
        result.mulScalar(0.5);
        result.x += pointA.x;
        result.y += pointA.y;
    }
    
    
    onTouchStartEndCancel(event: pc.TouchEvent) {
        // We only care about the first touch for camera rotation. As the user touches the screen, 
        // we stored the current touch position
        var touches: Array<pc.Touch> = event.touches;
        if (touches.length == 1) {
            this.lastTouchPoint.set(touches[0].x, touches[0].y);
        
        } else if (touches.length == 2) {
            // If there are 2 touches on the screen, then set the pinch distance
            this.lastPinchDistance = this.getPinchDistance(touches[0], touches[1]);
            this.calcMidPoint(touches[0], touches[1], this.lastPinchMidPoint);
        }
    }
    
    pan(midPoint: pc.Vec2) {
        var fromWorldPoint = this.fromWorldPoint;
        var toWorldPoint = this.toWorldPoint;
        var worldDiff = this.worldDiff;
        
        // For panning to work at any zoom level, we use screen point to world projection
        // to work out how far we need to pan the pivotEntity in world space 
        var camera = this.entity.camera;
        var distance = this.orbitCamera.distance;
        
        camera.screenToWorld(midPoint.x, midPoint.y, distance, fromWorldPoint);
        camera.screenToWorld(this.lastPinchMidPoint.x, this.lastPinchMidPoint.y, distance, toWorldPoint);
        
        worldDiff.sub2(toWorldPoint, fromWorldPoint);
         
        this.orbitCamera.pivotPoint.add(worldDiff);    
    }
    
    
    onTouchMove(event: pc.TouchEvent) {
        var pinchMidPoint = this.pinchMidPoint;
        
        // We only care about the first touch for camera rotation. Work out the difference moved since the last event
        // and use that to update the camera target position 
        var touches: Array<pc.Touch> = event.touches;
        if (touches.length == 1) {
            var touch = touches[0];
            
            this.orbitCamera.pitch -= (touch.y - this.lastTouchPoint.y) * this.orbitSensitivity;
            this.orbitCamera.yaw -= (touch.x - this.lastTouchPoint.x) * this.orbitSensitivity;
            
            this.lastTouchPoint.set(touch.x, touch.y);
        
        } else if (touches.length == 2) {
            // Calculate the difference in pinch distance since the last event
            var currentPinchDistance = this.getPinchDistance(touches[0], touches[1]);
            var diffInPinchDistance = currentPinchDistance - this.lastPinchDistance;
            this.lastPinchDistance = currentPinchDistance;
                    
            this.orbitCamera.distance -= (diffInPinchDistance * this.distanceSensitivity * 0.1) * (this.orbitCamera.distance * 0.1);
            
            // Calculate pan difference
            this.calcMidPoint(touches[0], touches[1], pinchMidPoint);
            this.pan(pinchMidPoint);
            this.lastPinchMidPoint.copy(pinchMidPoint);
        }
    }
}

pc.registerScript(TouchInput, "touchInput");

TouchInput.attributes.add("orbitSensitivity", {
    type: "number", 
    default: 0.4, 
    title: "Orbit Sensitivity", 
    description: "How fast the camera moves around the orbit. Higher is faster"
});

TouchInput.attributes.add("distanceSensitivity", {
    type: "number", 
    default: 0.2, 
    title: "Distance Sensitivity", 
    description: "How fast the camera moves in and out. Higher is faster"
});