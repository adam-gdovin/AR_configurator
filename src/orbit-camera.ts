class CameraEntity extends pc.Entity{
    camera: pc.CameraComponent;
}


class OrbitCamera extends pc.ScriptType{
    public entity: CameraEntity;
    public autoRender: boolean;
    private _autoRenderDefault: boolean = this.app.autoRender;

    public distanceMax: number;
    public distanceMin: number;
    public pitchAngleMax: number;
    public pitchAngleMin: number;
    public inertiaFactor: number;
    public focusEntity: pc.Entity;
    public frameOnStart: boolean;

    private _modelsAabb : pc.BoundingBox = new pc.BoundingBox();

    // Property to get and set the distance between the pivot point and camera
    // Clamped between this.distanceMin and this.distanceMax
    private _targetDistance: number;
    private _distance: number;
    public get distance(){
        return this._targetDistance;
    }
    public set distance(value:number) {
        this._targetDistance = this._clampDistance(value);
    }
    
    // Property to get and set the pitch of the camera around the pivot point (degrees)
    // Clamped between this.pitchAngleMin and this.pitchAngleMax
    // When set at 0, the camera angle is flat, looking along the horizon
    private _targetPitch: number;
    private _pitch: number;
    public get pitch(){
        return this._targetPitch;
    }
    public set pitch(value: number){
        this._targetPitch = this._clampPitchAngle(value);
    }

    // Property to get and set the yaw of the camera around the pivot point (degrees)
    private _targetYaw: number;
    private _yaw: number;
    public get yaw(){
        return this._targetYaw;
    }
    public set yaw(value: number){
        this._targetYaw = value;

        // Ensure that the yaw takes the shortest route by making sure that 
        // the difference between the targetYaw and the actual is 180 degrees
        // in either direction
        /*var diff = this._targetYaw - this._yaw;
        var reminder = diff % 360;
        if (reminder > 180) {
            this._targetYaw = this._yaw - (360 - reminder);
        } else if (reminder < -180) {
            this._targetYaw = this._yaw + (360 + reminder);
        } else {
            this._targetYaw = this._yaw + reminder;
        }*/
    }

    // Property to get and set the world position of the pivot point that the camera orbits around
    private _pivotPoint: pc.Vec3 = new pc.Vec3();
    public get pivotPoint(){
        return this._pivotPoint;
    }
    public set pivotPoint(value:pc.Vec3) {
        this._pivotPoint.copy(value);
    }
    
    private distanceBetween : pc.Vec3 = new pc.Vec3();
    private quatWithoutYaw : pc.Quat = new pc.Quat();
    private yawOffset : pc.Quat = new pc.Quat();
            
    // Moves the camera to look at an entity and all its children so they are all in the view   
    private focus(focusEntity: pc.Entity) {
        // Calculate an bounding box that encompasses all the models to frame in the camera view
        this._buildAabb(focusEntity, 0);

        var halfExtents = this._modelsAabb.halfExtents;

        var distance: number = Math.max(halfExtents.x, Math.max(halfExtents.y, halfExtents.z));
        distance = (distance / Math.tan(0.5 * (this.entity.camera.fov || 60) * pc.math.DEG_TO_RAD));
        distance = (distance * 2);

        this.distance = distance;

        this._removeInertia();

        this._pivotPoint.copy(this._modelsAabb.center);
    }


    // Set the camera position to a world position and look at a world position
    // Useful if you have multiple viewing angles to swap between in a scene
    private resetAndLookAtPoint(resetPoint: pc.Vec3, lookAtPoint: pc.Vec3) {
        this.pivotPoint.copy(lookAtPoint);
        this.entity.setPosition(resetPoint);

        this.entity.lookAt(lookAtPoint);

        var distance = this.distanceBetween;
        distance.sub2(lookAtPoint, resetPoint);
        this.distance = distance.length();

        this.pivotPoint.copy(lookAtPoint);

        var cameraQuat = this.entity.getRotation();
        this.yaw = this._calcYaw(cameraQuat);
        this.pitch = this._calcPitch(cameraQuat, this.yaw);

        this._removeInertia();
        this._updatePosition();

        if (!this.autoRender) {
            this.app.renderNextFrame = true;
        }
    }

    // Set camera position to a world position and look at an entity in the scene
    // Useful if you have multiple models to swap between in a scene
    private resetAndLookAtEntity(resetPoint: pc.Vec3, entity: pc.Entity) {
        this._buildAabb(entity, 0);
        this.resetAndLookAtPoint(resetPoint, this._modelsAabb.center);
    }


    // Set the camera at a specific, yaw, pitch and distance without inertia (instant cut)
    private reset(yaw: number, pitch: number, distance: number) {
        this.pitch = pitch;
        this.yaw = yaw;
        this.distance = distance;

        this._removeInertia();

        if (!this.autoRender) {
            this.app.renderNextFrame = true;
        }
    }


    public update(dt: number) {
        // Check if we have are still moving for autorender
        if (!this.autoRender) {
            var distanceDiff = Math.abs(this._targetDistance - this._distance);
            var yawDiff = Math.abs(this._targetYaw - this._yaw);
            var pitchDiff = Math.abs(this._targetPitch - this._pitch);

            this.app.renderNextFrame = this.app.renderNextFrame || distanceDiff > 0.01 || yawDiff > 0.01 || pitchDiff > 0.01;
        }

        // Add inertia, if any
        var t = this.inertiaFactor === 0 ? 1 : Math.min(dt / this.inertiaFactor, 1);
        this._distance = pc.math.lerp(this._distance, this._targetDistance, t);
        this._yaw = pc.math.lerp(this._yaw, this._targetYaw, t);
        this._pitch = pc.math.lerp(this._pitch, this._targetPitch, t);

        this._updatePosition();
    }


    private _updatePosition() {
        // Work out the camera position based on the pivot point, pitch, yaw and distance
        this.entity.setLocalPosition(0,0,0);
        this.entity.setLocalEulerAngles(this._pitch, this._yaw, 0);

        var position = this.entity.getPosition();
        position.copy(this.entity.forward);
        position.mulScalar(-this._distance);
        position.add(this.pivotPoint);
        this.entity.setPosition(position);
    }


    private _removeInertia() {
        this._yaw = this._targetYaw;
        this._pitch = this._targetPitch;
        this._distance = this._targetDistance;
    }


    private _checkAspectRatio() {
        var height: number = this.app.graphicsDevice.height;
        var width: number = this.app.graphicsDevice.width;

        // Match the axis of FOV to match the aspect ratio of the canvas so
        // the focused entities is always in frame
        this.entity.camera.horizontalFov = height > width;
    }


    private _buildAabb(entity: pc.Entity, modelsAdded: number) {
        var i = 0, j = 0, meshInstances;
        
        var allMeshInstances : Array<pc.MeshInstance> = [];
        var renders : Array<pc.RenderComponent> = entity.findComponents("render") as Array<pc.RenderComponent>;

        for (i = 0; i < renders.length; ++i) {
            meshInstances = renders[i].meshInstances;
            if (meshInstances) {
                for (j = 0; j < meshInstances.length; j++) {
                    allMeshInstances.push(meshInstances[j]);
                }
            }
        }  

        var models : Array<pc.ModelComponent> = entity.findComponents("model") as Array<pc.ModelComponent>;
        for (i = 0; i < models.length; ++i) {
            meshInstances = models[i].meshInstances;
            if (meshInstances) {
                for (j = 0; j < meshInstances.length; j++) {
                    allMeshInstances.push(meshInstances[j]);
                }
            }
        }  

        for (i = 0; i < allMeshInstances.length; i++) {
            if (modelsAdded === 0) {
                this._modelsAabb.copy(allMeshInstances[i].aabb);
            } else {
                this._modelsAabb.add(allMeshInstances[i].aabb);
            }

            modelsAdded += 1;
        }

        for (i = 0; i < entity.children.length; ++i) {
            modelsAdded += this._buildAabb(entity.children[i] as pc.Entity, modelsAdded);
        }

        return modelsAdded;
    }


    private _calcYaw(quat: pc.Quat) {
        var transformedForward : pc.Vec3 = new pc.Vec3();
        quat.transformVector(pc.Vec3.FORWARD, transformedForward);

        return Math.atan2(-transformedForward.x, -transformedForward.z) * pc.math.RAD_TO_DEG;
    }


    private _clampDistance(distance: number) {
        if (this.distanceMax > 0) {
            return pc.math.clamp(distance, this.distanceMin, this.distanceMax);
        } else {
            return Math.max(distance, this.distanceMin);
        }
    }


    private _clampPitchAngle (pitch: number) {
        // Negative due as the pitch is inversed since the camera is orbiting the entity
        return pc.math.clamp(pitch, -this.pitchAngleMax, -this.pitchAngleMin);
    }


    private _calcPitch(quat: pc.Quat, yaw:number) {
        var quatWithoutYaw = this.quatWithoutYaw;
        var yawOffset = this.yawOffset;

        yawOffset.setFromEulerAngles(0, -yaw, 0);
        quatWithoutYaw.mul2(yawOffset, quat);

        var transformedForward = new pc.Vec3();

        quatWithoutYaw.transformVector(pc.Vec3.FORWARD, transformedForward);

        return Math.atan2(transformedForward.y, -transformedForward.z) * pc.math.RAD_TO_DEG;
    }

    public initialize(){
        var self: OrbitCamera = this;

        this._checkAspectRatio();

        // Find all the models in the scene that are under the focused entity
        this._buildAabb(this.focusEntity || this.app.root, 0);
    
        this.entity.lookAt(this._modelsAabb.center);
    
        this._pivotPoint = new pc.Vec3();
        this._pivotPoint.copy(this._modelsAabb.center);
    
        // Calculate the camera euler angle rotation around x and y axes
        // This allows us to place the camera at a particular rotation to begin with in the scene
        var cameraQuat = this.entity.getRotation();
    
        // Preset the camera
        this._yaw = this._calcYaw(cameraQuat);
        this._pitch = this._clampPitchAngle(this._calcPitch(cameraQuat, this._yaw));
        this.entity.setLocalEulerAngles(this._pitch, this._yaw, 0);
    
        this._distance = 0;
    
        this._targetYaw = this._yaw;
        this._targetPitch = this._pitch;
    
        // If we have ticked focus on start, then attempt to position the camera where it frames
        // the focused entity and move the pivot point to entity's position otherwise, set the distance
        // to be between the camera position in the scene and the pivot point
        if (this.frameOnStart) {
            this.focus(this.focusEntity || this.app.root);
        } else {
            var distanceBetween: pc.Vec3 = new pc.Vec3();
            distanceBetween.sub2(this.entity.getPosition(), this._pivotPoint);
            this._distance = this._clampDistance(distanceBetween.length());
        }
    
        // Do not enable autoRender if it's already off as it's controlled elsewhere
        if (this.app.autoRender) {
            this.app.autoRender = this.autoRender;
        }
    
        if (!this.autoRender) {
            this.app.renderNextFrame = true;
        }
    
        this.on("attr:autoRender", function (value, prev) {
            self.app.autoRender = value;
            if (!self.autoRender) {
                self.app.renderNextFrame = true;
            }
        }, this);
    
        // Reapply the clamps if they are changed in the editor
        this.on("attr:distanceMin", function (value, prev) {
            self._targetDistance = self._clampDistance(self._distance);
        }, this);
    
        this.on("attr:distanceMax", function (value, prev) {
            self._targetDistance = self._clampDistance(self._distance);
        }, this);
    
        this.on("attr:pitchAngleMin", function (value, prev) {
            self._targetPitch = self._clampPitchAngle(self._pitch);
        }, this);
    
        this.on("attr:pitchAngleMax", function (value, prev) {
            self._targetPitch = self._clampPitchAngle(self._pitch);
        }, this);
    
        // Focus on the entity if we change the focus entity
        this.on("attr:focusEntity", function (value, prev) {
            if (self.frameOnStart) {
                self.focus(value || self.app.root);
            } else {
                self.resetAndLookAtEntity(self.entity.getPosition(), value || self.app.root);
            }
        }, this);
    
        this.on("attr:frameOnStart", function (value, prev) {
            if (value) {
                self.focus(self.focusEntity || self.app.root);
            }
        }, this);
    
        var onResizeCanvas = function () {
            self._checkAspectRatio();
            if (!self.autoRender) {
                self.app.renderNextFrame = true;
            }
        };
    
        this.app.graphicsDevice.on("resizecanvas", onResizeCanvas, this);
    
        this.on("destroy", function() {
            self.app.graphicsDevice.off("resizecanvas", onResizeCanvas, self);
            self.app.autoRender = self._autoRenderDefault;
        }, this);
    }
};

pc.registerScript(OrbitCamera, "orbitCamera");

OrbitCamera.attributes.add("autoRender", {
    type: "boolean", 
    default: true, 
    title: "Auto Render", 
    description: "Disable to only render when camera is moving (saves power when the camera is still)"
});

OrbitCamera.attributes.add("distanceMax", {type: "number", default: 0, title: "Distance Max", description: "Setting this at 0 will give an infinite distance limit"});
OrbitCamera.attributes.add("distanceMin", {type: "number", default: 0, title: "Distance Min"});
OrbitCamera.attributes.add("pitchAngleMax", {type: "number", default: 90, title: "Pitch Angle Max (degrees)"});
OrbitCamera.attributes.add("pitchAngleMin", {type: "number", default: -90, title: "Pitch Angle Min (degrees)"});

OrbitCamera.attributes.add("inertiaFactor", {
    type: "number",
    default: 0,
    title: "Inertia Factor",
    description: "Higher value means that the camera will continue moving after the user has stopped dragging. 0 is fully responsive."
});

OrbitCamera.attributes.add("focusEntity", {
    type: "entity",
    title: "Focus Entity",
    description: "Entity for the camera to focus on. If blank, then the camera will use the whole scene"
});

OrbitCamera.attributes.add("frameOnStart", {
    type: "boolean",
    default: true,
    title: "Frame on Start",
    description: "Frames the entity or scene at the start of the application."
});