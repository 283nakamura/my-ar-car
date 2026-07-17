AFRAME.registerComponent("hide-pilot", {

    schema: {

        nodeName: {
            type: "string",
            default: "pilot_31"
        }

    },

    init: function () {

        this.el.addEventListener("model-loaded", () => {

            const root = this.el.getObject3D("mesh");

            if (!root) {

                console.warn("hide-pilot: GLB mesh not found");
                return;

            }

            const targetNode =
                root.getObjectByName(this.data.nodeName);

            if (!targetNode) {

                console.warn(
                    "hide-pilot: Node not found:",
                    this.data.nodeName
                );

                return;

            }

            targetNode.visible = false;

            console.log(
                "Hidden GLB node:",
                this.data.nodeName
            );

        });

    }

});
