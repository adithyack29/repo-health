import networkx as nx

class GraphBuilder:
    def __init__(self):
        self.graph = nx.DiGraph()

    def build_from_parsed_data(self, parsed_data: dict):
        self.graph.clear()
        
        # Add files as nodes
        for filepath, data in parsed_data.items():
            self.graph.add_node(
                filepath, 
                id=filepath, 
                label=filepath.split('/')[-1], 
                type="file",
                size=data.get('size', 100)
            )
            
            # Simple heuristic for dependencies: 
            # if an import string contains another file's name, add an edge.
            # (In a real app, this would use precise AST resolution)
            for imp in data.get('imports', []):
                for other_file in parsed_data.keys():
                    if other_file != filepath:
                        basename = other_file.split('/')[-1].split('.')[0]
                        if basename in imp:
                            self.graph.add_edge(filepath, other_file, type="depends_on")

        return self.to_cytoscape_json()

    def to_cytoscape_json(self):
        data = nx.readwrite.json_graph.cytoscape_data(self.graph)
        return data['elements']
