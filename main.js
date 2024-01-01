import visual_interface from "./lib/visual_interface.js";
import topologies from "./topologies/dv_algorithm.json" assert { type: "json" };

// Network
let topology;
let nodes = [];
let edges = [];
let tables = [];
let vector_passes = [];

// ======================== Initialization ========================
// Selects the topology
visual_interface.topology_selection(topologies);
document.querySelectorAll('.topology_button').forEach(button => {
	button.addEventListener('click', (event) => {
		const clicked_button_id = event.target.id;
		topology = topologies[clicked_button_id];
		nodes = topology.nodes;
		edges = topology.edges;

		// Graphs the network
		visual_interface.graph_network(nodes, edges);

		// Fills the tables
		fill_tables();
		
		// Graphs each node table
		visual_interface.graph_tables(tables, nodes);

		// Graphs the edges forms
		visual_interface.edges_forms(edges, nodes);

		modify_edges_forms();

		// Hide the topology selection
		document.getElementById("topologies_full_screen").style.display = "none";
	});
});

// Fills each node tables (routing and vectors) with the nodes and edges
function fill_tables() {
	nodes.forEach((node) => {
		let vectors_table = [];

		// Initialize the table
		nodes.forEach((innerNode) => {
			vectors_table[innerNode] = {};
			nodes.forEach((columnNode) => {
				vectors_table[innerNode][columnNode] = innerNode === node && columnNode === node ? 0 : Number.POSITIVE_INFINITY;
			});
		});

		// Fills the cost to neighbors
		let filteredEdges = edges.filter((edge) => edge.nodes.includes(node));
		filteredEdges.forEach((edge) => {
			const [source, target] = edge.nodes;
			if (source == node) {
				vectors_table[source][target] = edge.cost;
			} else {
				vectors_table[target][source] = edge.cost; // Include this line for bidirectional edges
			}
		});

		// Fills the routing table
		let routing_table = {};
		nodes.forEach((innerNode) => {
			routing_table[innerNode] = vectors_table[node][innerNode] === Number.POSITIVE_INFINITY ? "-" : innerNode;
		});

		tables.push({ table_node: node, vectors_table, routing_table });
	});
}

function deep_copy(object) {
	let copy = Array.isArray(object) ? [] : {};
	for (let key in object) {
		let v = object[key];
		if (v) {
			if (typeof v === "object") {
				copy[key] = deep_copy(v);
			} else {
				copy[key] = v;
			}
		} else {
			copy[key] = v;
		}
	}
	return copy;
}

// ======================== Interfaces Provided to Nodes ========================
// Sends the vector to the neighbors of the node
function broadcast_vector(vector, node) {
	let neighbors = edges.filter((edge) => edge.nodes.includes(node));
	neighbors.forEach((neighbor) => {
		let neighbor_node = neighbor.nodes.find((neighbor_node) => neighbor_node !== node);
		let packaged_vector = {
			from: node,
			to: neighbor_node,
			date: Date.now(),
			vector: deep_copy(vector),
		};
		vector_passes.push(packaged_vector);
		visual_interface.edge_send(node, neighbor_node);
	});
}

// Receives the vectors sent to the node
function recv_vector(node) {
	let recv_vectors = vector_passes.filter((packaged_vector) => packaged_vector.to === node);
	vector_passes = vector_passes.filter((packaged_vector) => packaged_vector.to !== node);
	return recv_vectors;
}

// Updates the vectors of the node table
function update_vectors(vectors_table, vectors, node) {
	vectors.forEach((packaged_vector) => {
		let neighbor_node = packaged_vector.from;
		let neighbor_vector = packaged_vector.vector;
		vectors_table[neighbor_node] = neighbor_vector;
		visual_interface.update_vector(node, neighbor_node, neighbor_vector);
	});
}

// Discards the repeated vectors (keeps the newest)
function discard_repeated_old_vectors(vectors) {
	const uniqueVectors = {};

	vectors.forEach((vector) => {
		const existingVector = uniqueVectors[vector.from];

		if (!existingVector || existingVector.date < vector.date) {
			uniqueVectors[vector.from] = vector;
		}
	});

	// Convert the object back to an array
	const filteredVectors = Object.values(uniqueVectors);

	return filteredVectors;
}

// Gives the table of the node
function get_my_vectors_table(node) {
	return tables.find((vectors_table) => vectors_table.table_node === node).vectors_table;
}

// Return the routing table of the node
function get_my_routing_table(node) {
	return tables.find((routing_table) => routing_table.table_node === node).routing_table;
}

// Returns the cost of the edge between the node and the target_node, if there is no edge, returns Infinity
function get_direct_cost(node, target_node) {
	const edge = edges.find((edge) => edge.nodes.includes(node) && edge.nodes.includes(target_node));
	return edge === undefined ? Number.POSITIVE_INFINITY : edge.cost;
}

// Returns the neighbors of the node
function get_neighbors(node) {
	const node_edges = edges.filter((edge) => edge.nodes.includes(node));
	return node_edges.map((edge) => edge.nodes.find((neighbor) => neighbor !== node));
}

// Updates the node vector applying the Bellman-Ford equation (returns True when the vector has changed)
function bellman_ford_equation(vectors_table, node, routing_table) {
	const targets_nodes = Object.keys(vectors_table[node]).filter((targetNode) => targetNode !== node);
	const before_vector = deep_copy(vectors_table[node]);
	const neighbors = get_neighbors(node);

	targets_nodes.forEach((target_node) => {
		if (target_node !== node) {
			// Find the intermediate node that results in the minimum distance
			let min_intermediate_node = "";
			let min_distance = Number.POSITIVE_INFINITY;

			// For each neighbor, calculate the distance to the target node (D_neighbor(target) + c(node, neighbor)) and find the minimum
			neighbors.forEach((neighbor) => {
				const distance = get_direct_cost(node, neighbor) + vectors_table[neighbor][target_node];
				if (distance < min_distance) {
					min_distance = distance;
					min_intermediate_node = neighbor;
				}
			});

			// Update the table with the minimum distance
			vectors_table[node][target_node] = min_distance;

			// Update the intermediate nodes object
			routing_table[target_node] = min_intermediate_node;
		}
	});

	return JSON.stringify(before_vector) !== JSON.stringify(vectors_table[node]);
}

// ======================== DV Algorithm ========================
document.getElementById("start_dv_algorithm").addEventListener("click", () => {
	nodes.forEach((node, index) => {
		setTimeout(() => {
			broadcast_vector(get_my_vectors_table(node)[node], node);
		}, 1000 * index); // Use index to stagger the timeouts
	});
	document.getElementById("start_dv_algorithm").style.display = "none";
	document.getElementById("reset_button").style.display = "block";
	document.getElementById("run_next_node").style.display = "block";
});

let actual_node = 0;
document.getElementById("run_next_node").addEventListener("click", () => {
	let node = nodes[actual_node];

	let vectors_table = get_my_vectors_table(node);
	let routing_table = get_my_routing_table(node);

	visual_interface.focus_table(node);

	// Receive vectors from neighbors
	let recv_vectors = recv_vector(node);

	// Update vectors
	update_vectors(vectors_table, discard_repeated_old_vectors(recv_vectors), node);

	let send_vector = bellman_ford_equation(vectors_table, node, routing_table);

	setTimeout(() => {
		if (send_vector) {
			visual_interface.update_vector(node, node, vectors_table[node]);
			visual_interface.update_routing_table(node, routing_table);
			// Broadcast vector to neighbors
			setTimeout(() => {
				broadcast_vector(vectors_table[node], node);
			}, 800);
		}
	}, 1200);

	actual_node = (actual_node + 1) % nodes.length;
	document.getElementById("run_next_node").innerHTML = "Run node: " + nodes[actual_node];
});

// ======================== Modify Edges ========================
function modify_edges_forms() {
document.querySelectorAll(".change_edge_form").forEach((form) => {
	form.addEventListener("submit", (event) => {
		event.preventDefault(); // Prevent default form submission
		const action = event.submitter.value; // Get the action (modify or delete)

		if (action === "modify") {
			const new_cost = parseInt(form.querySelector("input[name='cost']").value);

			// Find the corresponding edge in the edges array and update its cost
			const form_nodes = form.querySelectorAll("p");
			const edge_index = edges.findIndex((edge) => 
				(edge.nodes[0] === form_nodes[0].textContent && edge.nodes[1] === form_nodes[1].textContent) ||
					(edge.nodes[0] === form_nodes[1].textContent && edge.nodes[1] === form_nodes[0].textContent)
			);

			if (edge_index !== -1) {
				edges[edge_index].cost = new_cost;
				visual_interface.update_edge(edges[edge_index]);
			}
		} else if (action === "delete") {
			// Find the corresponding edge in the edges array and remove it
			const form_nodes = form.querySelectorAll("p");
			const edge_index = edges.findIndex((edge) => 
				(edge.nodes[0] === form_nodes[0].textContent && edge.nodes[1] === form_nodes[1].textContent) ||
					(edge.nodes[0] === form_nodes[1].textContent && edge.nodes[1] === form_nodes[0].textContent)
			);
			if (edge_index !== -1) {
				// edges.splice(edge_index, 1);
			}
		}
	});
});
};
// ======================== Extra ========================
let modify_edges_form = false;
document.getElementById("modify_edges_forms").addEventListener("click", () => {
	if (modify_edges_form) {
		document.getElementById("full_screen").style.display = "none";
		modify_edges_form = false;
	} else {
		document.getElementById("full_screen").style.display = "block";
		modify_edges_form = true;
	}
});
