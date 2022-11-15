class Product extends pc.ScriptType{
    public entity: pc.Entity;
};

class Chair extends Product{
    public trimMaterials: Array<pc.Material>;

    initialize(){
        let TrimOptions: Array<MultipleChoiceOption> = [
            new MultipleChoiceMaterialOption("White", null, pc.Color.WHITE),
            new MultipleChoiceMaterialOption("Yellow", null, pc.Color.YELLOW),
            new MultipleChoiceMaterialOption("Red", null, pc.Color.RED)
        ]
        
        let ChairTrimOptions = new MultipleChoiceMaterialSelector("Trim", TrimOptions, this.trimMaterials)

        SceneManager.instance.UI.addProductOption(ChairTrimOptions);
    }
}
pc.registerScript(Chair, "chair");

Chair.attributes.add("trimMaterials", {type: "asset", assetType: "material", array: true});