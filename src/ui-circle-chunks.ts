class UICircle extends pc.ScriptType{
    entity: pc.Entity;
    
    initialize(){
        if(!this.entity.element || this.entity.element.type !== pc.ELEMENTTYPE_IMAGE)
            return;
        let material: pc.StandardMaterial = this.entity.element._image._material.clone() as pc.StandardMaterial;
        this.entity.element._image._material = material;
        material.chunks.endPS = `
        if(length(vec2(vUv0.x-0.5, vUv0.y-0.5)) > 0.5)
            discard;
        gl_FragColor.rgb = combineColor();
    
        gl_FragColor.rgb += dEmission;
        gl_FragColor.rgb = addFog(gl_FragColor.rgb);
    
        gl_FragColor.rgb = toneMap(gl_FragColor.rgb);
        gl_FragColor.rgb = gammaCorrectOutput(gl_FragColor.rgb);`;
        material.chunks.APIVersion = pc.CHUNKAPI_1_57;
        this.entity.element._image._updateMaterial(true);
    }
}
pc.registerScript(UICircle, "uiCircle");