AFRAME.registerComponent("spin-rotors", {

    schema: {

        rpm: {
            type: "number",
            default: 3000
        }

    },

    init: function () {

        this.cwRotors = [];
        this.ccwRotors = [];

        this.el.addEventListener("model-loaded", () => {

            const root = this.el.getObject3D("mesh");

            root.traverse((obj) => {

                if (obj.name.includes("Rotor_CW")) {

                    this.cwRotors.push(obj);
                    console.log("CW Rotor :", obj.name);

                }

                if (obj.name.includes("Rotor_CCW")) {

                    this.ccwRotors.push(obj);
                    console.log("CCW Rotor :", obj.name);

                }

            });

            console.log(
                "Rotor Search Complete",
                "CW =", this.cwRotors.length,
                "CCW =", this.ccwRotors.length
            );

        });

    },

    tick: function (time, delta) {

        if (this.cwRotors.length === 0)
            return;

        // RPM → rad/sec
        const radPerSecond =
            this.data.rpm * Math.PI * 2 / 60;

        const angle =
            radPerSecond * delta / 1000;

        this.cwRotors.forEach((rotor) => {

            rotor.rotation.z -= angle;

        });

        this.ccwRotors.forEach((rotor) => {

            rotor.rotation.z += angle;

        });

    }

});
