class UI extends pc.ScriptType{
    public entity: pc.Entity;
    private AR_toggle: pc.ElementComponent;

    public productOptions: Array<OptionSelector> = new Array<OptionSelector>();

    initialize(){
        this.AR_toggle = (this.entity.findByName("AR") as any).element as pc.ElementComponent;
        /*if(!this.app.xr.supported || !this.app.xr.isAvailable(pc.XRTYPE_AR)){
            this.AR_toggle.entity.enabled = false;
        }*/
        this.AR_toggle.on("click", (e: pc.ElementInputEvent)=>{
            if(this.app.xr.active)
                this.app.xr.end();
            else                
                this.app.xr.start(SceneManager.instance.camera, pc.XRTYPE_AR, pc.XRSPACE_LOCALFLOOR);
        })
    }

    public addProductOption(productOption: OptionSelector){
        this.productOptions.push(productOption);
        productOption.reparent(this.entity);
    }
};

pc.registerScript(UI, "ui");

interface MultipleChoiceOption {
    name: string;
    preview: pc.Texture | pc.Sprite | pc.Color;
}

class MultipleChoiceMaterialOption implements MultipleChoiceOption{ 
    public name: string;
    public texture: pc.Texture | null;
    public color: pc.Color;
    public preview: pc.Texture | pc.Sprite | pc.Color;

    constructor(name: string, texture: pc.Texture | null, color: pc.Color = pc.Color.WHITE){
        this.name = name;
        this.texture = texture;
        this.color = color;
    }
}

class MultipleChoiceRenderOption implements MultipleChoiceOption{ 
    public name: string;
    public asset: pc.Asset;
    public preview: pc.Texture | pc.Sprite | pc.Color;

    constructor(name: string, preview: pc.Texture | pc.Sprite | pc.Color, asset: pc.Asset){
        this.name = name;
        this.preview = preview;
        this.asset = asset;
    }
}

interface OptionSelector{
    entity: pc.Entity;
    name: string;

    reparent(entity: pc.Entity): void;
    open(): void;
    close(): void;
}

class MultipleChoiceOptionSelector implements OptionSelector{
    private optionTemplate: pc.Asset = pc.app.assets.find("Option", "template") as pc.Asset;
    private groupTemplate: pc.Asset = pc.app.assets.find("Options_multiple_choice", "template") as pc.Asset;
    
    private contentElement: pc.ElementComponent;
    private selectedPreviewElement: pc.ElementComponent;
    private scrollElement: pc.ElementComponent;
    private _openWidth: number;

    private _selected: number = 0;
    public get selected(){
        return this._selected;
    }
    public set selected(value: number){
        this._selected = value;
        this.selectedPreviewElement.texture = this.elements[value].texture;
        this.selectedPreviewElement.sprite = this.elements[value].sprite;
        this.selectedPreviewElement.color = this.elements[value].color;
    }

    public name: string;
    public entity: pc.Entity;
    
    public elements: Array<pc.ElementComponent>;

    protected constructor(name: string, options: Array<MultipleChoiceOption>){
        this.name = name;
        this.entity = this.groupTemplate.resource.instantiate();

        this.contentElement = (this.entity.findByName("Content") as pc.Entity).element as pc.ElementComponent;
        this.selectedPreviewElement = (this.entity.findByPath("Main/Image") as pc.Entity).element as pc.ElementComponent;
        this.scrollElement = (this.entity.findByName("ScrollView") as pc.Entity).element as pc.ElementComponent;
        this._openWidth = this.scrollElement.width;
        this.scrollElement.width = 0; //Close by default

        (this.entity.findByPath("Main") as pc.Entity).element?.on("click", ()=>{
            this.open();
            console.log("yep");
        });

        this.elements = this.populate(options);
        this.selected = 0;
    }

    private populate(options: Array<MultipleChoiceOption>) : Array<pc.ElementComponent> {
        let elements = options.map(option => {
            let childEntity = this.optionTemplate.resource.instantiate();
            childEntity.reparent(this.contentElement.entity);

            let element = childEntity.element;
            if(option.preview instanceof pc.Texture)
                element.texture = option.preview;
            else if(option.preview instanceof pc.Sprite)
                element.sprite = option.preview;
            else if (option.preview instanceof pc.Color)
                element.color = option.preview;
            return element;
        });
        return elements;
    }
    
    public reparent(parent: pc.Entity){
        this.entity.reparent(parent);
    }

    public open(): void {
        this.scrollElement.width = this._openWidth;
    }
    public close(): void {
        this.scrollElement.width = 0;
    }
}

class MultipleChoiceMaterialSelector extends MultipleChoiceOptionSelector {
    private materials: Array<pc.Material>;

    constructor(name: string, options: Array<MultipleChoiceOption>, materials: Array<pc.Material>){
        super(name, options);
        this.materials = materials;
        this.elements.forEach((element, idx) => {
            element.on("click", ()=>{
                this.selected = idx;
                this.close();
            })
        });
    }
}