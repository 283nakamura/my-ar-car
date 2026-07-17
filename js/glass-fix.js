AFRAME.registerComponent("brighten-glass", {

    schema: {

        opacity: {
            type: "number",
            default: 0.18
        },

        roughness: {
            type: "number",
            default: 0.08
        }

    },

    init: function () {

        this.el.addEventListener("model-loaded", () => {

            const root = this.el.getObject3D("mesh");

            if (!root) {

                console.warn("brighten-glass: GLB mesh not found");
                return;

            }

            root.traverse((object) => {

                if (!object.isMesh || !object.material) {
                    return;
                }

                const materials = Array.isArray(object.material)
                    ? object.material
                    : [object.material];

                materials.forEach((originalMaterial, index) => {

                    if (!originalMaterial) {
                        return;
                    }

                    const materialName =
                        originalMaterial.name || "";

                    if (
                        materialName.toLowerCase().includes("glass")
                    ) {

                        /*
                         * 他のオブジェクトとマテリアルを共有している場合に備え、
                         * 複製してから変更します。
                         */
                        const glassMaterial =
                            originalMaterial.clone();

                        glassMaterial.name =
                            originalMaterial.name;

                        /*
                         * 黒い色味を除去
                         */
                        glassMaterial.color.setRGB(1, 1, 1);

                        /*
                         * ガラスを明るく、透過しやすくする
                         */
                        glassMaterial.transparent = true;
                        glassMaterial.opacity =
                            this.data.opacity;

                        /*
                         * 金属感をなくす
                         */
                        glassMaterial.metalness = 0;

                        /*
                         * 反射のぼやけ具合
                         */
                        glassMaterial.roughness =
                            this.data.roughness;

                        /*
                         * 透明物の奥側が描画されなくなる問題を抑える
                         */
                        glassMaterial.depthWrite = false;

                        /*
                         * カメラが室内側にあっても表示できるようにする
                         */
                        glassMaterial.side =
                            THREE.DoubleSide;

                        glassMaterial.needsUpdate = true;

                        if (Array.isArray(object.material)) {

                            object.material[index] =
                                glassMaterial;

                        } else {

                            object.material =
                                glassMaterial;

                        }

                        console.log(
                            "Glass material adjusted:",
                            object.name,
                            materialName
                        );
                    }

                });

            });

        });

    }

});
