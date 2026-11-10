import * as THREE from "three";

// Quatre paires de faisceaux courbes reliées par une surface colorée translucide.
export function creerRayonsSphere() {
    const groupe = new THREE.Group();
    const uTemps = { value: 0 }, uFondu = { value: 1 };
    const geometrie = new THREE.PlaneGeometry(1, 1, 96, 12);
    // THREE.Color convertit les HEX sRGB vers l'espace linéaire du shader.
    const palette = ["#43227F", "#8755E9", "#D66AF4", "#477EFF", "#66DFFF", "#E9D8FF"]
        .map(hex => new THREE.Color(hex));
    const faisceaux = [];
    for (let coin = 0; coin < 4; coin++) {
        const material = new THREE.ShaderMaterial({
            uniforms: { uTemps, uFondu, uCoin: { value: coin }, uPalette: { value: palette } },
            transparent: true, depthWrite: false, side: THREE.DoubleSide,
            blending: THREE.NormalBlending,
            vertexShader: `
                uniform float uTemps, uCoin;
                varying vec2 vUv;
                varying float vDistance;
                void main() {
                    vUv = uv;
                    float s = uv.x;
                    float a = sin(s*3.92699 + uCoin*.3)*.6 + (s-.5)*.65;
                    float b = sin(s*3.92699 + .8 + uCoin*.3)*.6 - (s-.5)*.9;
                    float onde = sin(s*7.0-uTemps*.18+uCoin)*.035;
                    vec3 p = vec3((s-.5)*7.4, mix(a,b,uv.y)+onde,
                        -.15-uv.y*.25+sin(s*6.28318+uCoin)*.3);
                    p.z += sin(s*5.0+uTemps*.15+uv.y*1.5)*sin(uv.y*3.14159)*.08;
                    vec4 vue = modelViewMatrix*vec4(p,1.0);
                    vDistance=length(vue.xyz);
                    gl_Position=projectionMatrix*vue;
                }
            `,
            fragmentShader: `
                uniform float uTemps, uFondu;
                uniform vec3 uPalette[6];
                varying vec2 vUv;
                varying float vDistance;
                float hash(vec2 p) {
                    return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
                }
                float bruit(vec2 p) {
                    vec2 i=floor(p),f=fract(p);
                    f=f*f*(3.0-2.0*f);
                    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
                        mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
                }
                vec3 couleurPalette(float valeur) {
                    // Seuils cumulés de la palette : 30 / 25 / 20 / 15 / 8 / 2.
                    vec3 couleur=uPalette[0];
                    couleur=mix(couleur,uPalette[1],smoothstep(.16,.43,valeur));
                    couleur=mix(couleur,uPalette[2],smoothstep(.43,.67,valeur));
                    couleur=mix(couleur,uPalette[3],smoothstep(.65,.84,valeur));
                    couleur=mix(couleur,uPalette[4],smoothstep(.82,.965,valeur));
                    return couleur;
                }
                void main() {
                    float s=vUv.x, t=vUv.y;
                    float distanceBord=min(t,1.0-t);
                    float douceur=max(fwidth(t)*1.2,.003);
                    float coeur=1.0-smoothstep(.0,douceur*1.8,distanceBord);
                    float lueur=exp(-pow(distanceBord/.06,2.0));
                    float interieur=pow(max(sin(t*3.14159),0.0),.7);
                    float bouts=smoothstep(0.0,.14,s)*(1.0-smoothstep(.87,1.0,s));
                    float mouvement=.87+.08*sin(s*17.0-uTemps*.35)+.05*sin(s*39.0+uTemps*.23);
                    float attenuation=exp(-max(vDistance-2.5,0.0)*.13);
                    vec2 derive=vec2(uTemps*.035,-uTemps*.023);
                    // Les champs de transparence sont indépendants de la nouvelle palette.
                    // Nappes organiques en deux dimensions, sans bandes ni répétition brusque.
                    vec2 p=vec2(s*7.0,t*3.2)+derive;
                    vec2 torsion=vec2(bruit(p*.65+vec2(2.3,5.1)),
                        bruit(p*.7+vec2(8.7,1.4)))-.5;
                    float nappe=bruit(p+torsion*1.7);
                    float detail=bruit(p*1.85-torsion*.7+vec2(5.2,3.6));
                    float repartition=nappe*.8+detail*.2;
                    float masque=smoothstep(.39,.61,repartition);
                    float refletLocal=bruit(vec2(s*9.0-uTemps*.018,4.2));
                    float taches=smoothstep(.38,.62,refletLocal);
                    // Environ 2 % de liserés et 18 % de dégradé intérieur adjacent.
                    // Les deux zones partagent les mêmes taches le long des arêtes.
                    float aretes=1.0-smoothstep(.012,.028,distanceBord);
                    float voisinage=1.0-smoothstep(.02,.38,distanceBord);
                    float violetArete=taches*aretes;
                    float violetInterieur=taches*max(voisinage-aretes,0.0);
                    float teinte=bruit(p*.85+torsion+vec2(12.4,7.3));
                    // Élargir la distribution du bruit pour conserver les teintes minoritaires.
                    teinte=smoothstep(.18,.82,teinte);
                    vec3 couleur=couleurPalette(teinte);
                    // Reflets lavande indépendants des nappes : petites touches réparties sur le ruban.
                    float grainLavande=bruit(p*2.7+torsion*.6+vec2(31.2,16.7));
                    float lavande=smoothstep(.7,.91,grainLavande);
                    lavande*=.45+.55*bruit(p*.9+vec2(6.1,22.4));
                    couleur=mix(couleur,uPalette[5],lavande*.8);
                    float reflet=exp(-pow((t-.45-sin(s*5.0+uTemps*.16)*.18)*9.0,2.0));
                    float remplissage=interieur*(.17+reflet*.07)*max(masque,violetInterieur*.65);
                    float alpha=(remplissage+lueur*.12+coeur*.34)*bouts*mouvement*attenuation*uFondu;
                    gl_FragColor=vec4(couleur,alpha);
                    #include <tonemapping_fragment>
                    #include <colorspace_fragment>
                }
            `,
        });
        const mesh = new THREE.Mesh(geometrie, material);
        mesh.frustumCulled = false;
        groupe.add(mesh);
        faisceaux.push(mesh);
    }
    return {
        groupe,
        actualiser(temps,fondu,largeur,hauteur) {
            uTemps.value=temps;
            uFondu.value=fondu;
            groupe.visible=fondu>.001;
            faisceaux.forEach((support,i)=>{
                const droite=i%2===1,haut=i<2;
                support.position.set((droite?1:-1)*largeur*.65,
                    (haut?1:-1)*hauteur*.7+Math.sin(temps*.17+i)*.055,-1.1);
                support.rotation.z=(droite===haut?-.43:.43)+Math.sin(temps*.11+i)*.035;
                support.scale.x=Math.max(.85,largeur/3.4);
            });
        },
    };
}
