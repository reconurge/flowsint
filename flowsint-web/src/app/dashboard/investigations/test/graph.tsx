'use client';
import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
// @ts-ignore
import fcose from 'cytoscape-fcose';
// @ts-ignore
import cxtmenuPlugin from 'cytoscape-cxtmenu';
cytoscape.use(cxtmenuPlugin);
cytoscape.use(fcose)

interface GraphProps {
    data: any;
    currentNode: any,
    setCurrentNode: (node: { data: any }) => void;
    setOpenDialog: (state: boolean) => void;
}

export default function Graph({ data, currentNode, setCurrentNode, setOpenDialog }: GraphProps) {
    const cyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!cyRef.current) return;

        const cy = cytoscape({
            container: cyRef.current,
            elements: data,
            // @ts-ignore
            layout: {
                name: 'cose',
                animate: true,
                idealEdgeLength: () => 200,
                nodeOverlap: 40,
                refresh: 20,
                fit: true,
                padding: 30,
                randomize: false,
                componentSpacing: 1000,
                nodeRepulsion: 400000,
                edgeElasticity: 100,
                nestingFactor: 5,
                gravity: 80,
                numIter: 1000,
                initialTemp: 200,
                coolingFactor: 0.95,
                minTemp: 1.0
            },
            style: [
                {
                    selector: 'node[type="person"]',
                    style: {
                        'background-color': '#4CAF50',
                        "background-height": "2px",
                        "background-width": "2px",
                        'shape': 'ellipse',
                        'background-image': '/person.svg', // petit icône SVG de profil
                        'background-fit': 'contain',
                        'label': 'data(label)',
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'font-size': 8,
                        'text-margin-y': 25,
                        'padding': "12px",
                        'border-width': 4,
                        'border-color': '#4CAF50',
                        'width': 60,
                        'height': 60,
                        'text-margin-x': 0, // Décalage horizontal
                    },
                },
                {
                    selector: 'node[type="domain"]',
                    style: {
                        'background-color': '#2196F3',
                        'shape': 'ellipse',
                        'background-image': '/icons/domain.svg',
                        'background-fit': 'cover',
                        'label': 'data(label)',
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'color': '#333',
                        'font-size': 12,
                        'text-margin-y': 5,
                        'width': 60,
                        'height': 60,
                        'border-width': 3,
                        'border-color': '#2196F3',
                    },
                },
                {
                    selector: 'node[type="website"]',
                    style: {
                        'background-color': '#2196F3',
                        'shape': 'ellipse',
                        'background-image': '/icons/domain.svg',
                        'background-fit': 'cover',
                        'label': 'data(label)',
                        'text-valign': 'bottom',
                        'text-halign': 'center',
                        'color': '#333',
                        'font-size': 12,
                        'text-margin-y': 5,
                        'width': 60,
                        'height': 60,
                        'border-width': 3,
                        'border-color': '#2196F3',
                    },
                },
                {
                    selector: 'edge',
                    style: {
                        'width': 1,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        // 'label': 'data(label)',
                        'font-size': 10,
                        'text-rotation': 'autorotate',
                        'text-margin-y': -10,
                        'opacity': 0.5  // Réduit l'opacité des arêtes à 50%
                    },
                },
                {
                    selector: 'node',
                    style: {
                        'background-color': '#666',
                        'shape': 'ellipse',
                        'label': 'data(label)',
                        'color': '#fff',
                        'font-size': 12,
                        'text-valign': 'center',
                        'text-halign': 'center',
                        'width': 40,
                        'height': 40,
                    },
                },
            ],
        });

        // Context menu settings
        const defaults = {
            menuRadius: function () { return 60; }, // the outer radius in pixels
            selector: 'node', // elements matching this Cytoscape.js selector will trigger cxtmenus
            commands: [
                {
                    content: 'View',

                    select: function (ele: { data: () => any; }) {
                        alert(ele.data());
                    }
                },
                {
                    id: 'add-node',
                    tooltipText: 'add node',
                    image: { src: "add.svg", width: 12, height: 12, x: 6, y: 4 },
                    selector: 'node',
                    coreAsWell: true,
                    content: 'Add relation',
                    select: function (ele: { data: () => any; }) {
                        setOpenDialog(true)
                    }
                }, {
                    content: 'Delete',
                    select: function (ele: { data: () => any; }) {
                        alert(ele.data());
                    }
                }

            ],
            fillColor: 'rgba(0, 0, 0, 0.75)',
            activeFillColor: 'rgba(1, 105, 217, 0.75)',
            activePadding: 20,
            indicatorSize: 24,
            separatorWidth: 3,
            spotlightPadding: 4,
            adaptativeNodeSpotlightRadius: false,
            minSpotlightRadius: 24,
            maxSpotlightRadius: 38,
            openMenuEvents: 'cxttapstart taphold',
            itemColor: 'white',
            itemTextShadowColor: 'transparent',
            zIndex: 9999,
            atMouse: false,
            outsideMenuCancel: false
        };

        // @ts-ignore - To bypass TypeScript errors
        const menu = cy.cxtmenu(defaults);


        cy.on('tap', 'node', (evt) => {
            const node = evt.target;
            console.log(node.data());
            setCurrentNode({ data: node.data() });
        });

        return () => {
            cy.destroy();
            // @ts-ignore - To bypass TypeScript errors
            if (menu && typeof menu.destroy === 'function') {
                menu.destroy();
            }
            // The navigator is automatically destroyed when cy is destroyed
        };
    }, [data, setCurrentNode]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={cyRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}