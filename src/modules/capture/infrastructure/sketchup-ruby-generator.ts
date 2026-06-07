// ============================================
// NEXO CAPTURE — SketchUp Ruby Script Generator
// Gera script Ruby pronto para SketchUp Ruby Console
// ============================================

interface ProjectData {
  name: string;
  walls: Array<{
    start: [number, number];
    end: [number, number];
    thickness?: number;
  }>;
  doors: Array<{
    wallIndex: number;
    position: number;
    width: number;
    height?: number;
  }>;
  windows: Array<{
    wallIndex: number;
    position: number;
    width: number;
    height: number;
    sill?: number;
  }>;
}

export function generateSketchUpRubyScript(project: ProjectData): string {
  const wallsJson = JSON.stringify(project.walls, null, 2);
  const doorsJson = JSON.stringify(project.doors, null, 2);
  const windowsJson = JSON.stringify(project.windows, null, 2);
  const projectName = project.name.replace(/[^a-zA-Z0-9_-]/g, '_');

  return `# ============================================
# NEXO CAPTURE — SketchUp Script
# Projeto: ${project.name}
# Gerado em: ${new Date().toISOString()}
# ============================================
#
# INSTRUÇÕES:
# 1. Abra o SketchUp
# 2. Window > Ruby Console
# 3. Cole este script inteiro e pressione Enter
# 4. O arquivo será salvo na área de trabalho
# 5. Importe o .SKP no Promob Connect
#
# ============================================

require 'sketchup'

module NexoCapture
  # ============================================
  # CONFIGURAÇÃO
  # ============================================
  WALL_HEIGHT = 2700.mm        # mm
  WALL_THICKNESS = 150.mm      # mm
  DOOR_HEIGHT = 2100.mm
  WINDOW_SILL = 1100.mm

  # Dados do projeto (gerados pelo NEXO CAPTURE)
  PROJECT_NAME = "${projectName}"
  WALLS_DATA = ${wallsJson}
  DOORS_DATA = ${doorsJson}
  WINDOWS_DATA = ${windowsJson}

  # ============================================
  # WALL GENERATOR
  # ============================================
  class WallGenerator
    def initialize(model)
      @model = model
    end

    def generate
      @model.start_operation("NEXO Capture - " + PROJECT_NAME, true)

      # Criar layers
      create_layers

      # Criar componentes separados
      paredes = create_paredes_component
      portas = create_portas_component
      janelas = create_janelas_component

      # Criar grupo principal
      main_group = @model.entities.add_group
      main_group.name = "NEXO_" + PROJECT_NAME

      # Adicionar instâncias dos componentes
      main_group.entities.add_instance(paredes, ORIGIN)
      main_group.entities.add_instance(portas, ORIGIN)
      main_group.entities.add_instance(janelas, ORIGIN)

      @model.commit_operation

      # Salvar
      output_path = save_file
      puts ""
      puts "✅ Arquivo SKP gerado com sucesso!"
      puts "📁 Local: " + output_path
      puts "🏠 Projeto: " + PROJECT_NAME
      puts "📐 Paredes: " + WALLS_DATA.length.to_s
      puts "🚪 Portas: " + DOORS_DATA.length.to_s
      puts "🪟 Janelas: " + WINDOWS_DATA.length.to_s
      puts ""
      puts "👉 Para abrir: File > Open > selecione o arquivo .skp"
      puts "👉 Para Promob: Importe este .SKP no Promob Connect"

      return output_path
    rescue => e
      @model.abort_operation
      puts "❌ ERRO: " + e.message
      puts e.backtrace.first(5).join("\\n")
    end

    private

    def create_layers
      ['PAREDES', 'PORTAS', 'JANELAS', 'COTAS'].each do |name|
        @model.layers.add(name) unless @model.layers[name]
      end
      @model.layers.active = @model.layers['PAREDES']
    end

    def create_paredes_component
      definition = @model.definitions.add("PAREDES_" + PROJECT_NAME)

      WALLS_DATA.each_with_index do |wall, i|
        create_wall_face(definition, wall, i)
      end

      definition
    end

    def create_wall_face(definition, wall, index)
      # Converter mm para inches (unidade interna SketchUp)
      sx = wall["start"][0] / 25.4
      sy = wall["start"][1] / 25.4
      ex = wall["end"][0] / 25.4
      ey = wall["end"][1] / 25.4

      thickness = (wall["thickness"] || WALL_THICKNESS) / 25.4
      height = WALL_HEIGHT / 25.4

      # Vetor direção
      dx = ex - sx
      dy = ey - sy
      length = Math.sqrt(dx * dx + dy * dy)
      return if length == 0

      # Normal perpendicular
      nx = -dy / length * thickness / 2
      ny = dx / length * thickness / 2

      # Pontos do polígono
      pts = [
        Geom::Point3d.new(sx + nx, sy + ny, 0),
        Geom::Point3d.new(ex + nx, ey + ny, 0),
        Geom::Point3d.new(ex - nx, ey - ny, 0),
        Geom::Point3d.new(sx - nx, sy - ny, 0)
      ]

      # Criar face
      face = definition.entities.add_face(pts)
      face.reverse! if face.normal.z < 0

      # Extrudar
      face.pushpull(-height)

      # Layer
      face.layer = @model.layers['PAREDES']
    end

    def create_portas_component
      definition = @model.definitions.add("PORTAS_" + PROJECT_NAME)

      DOORS_DATA.each_with_index do |door, i|
        create_door_opening(definition, door, i)
      end

      definition
    end

    def create_door_opening(definition, door, index)
      wall = WALLS_DATA[door["wallIndex"]]
      return unless wall

      sx = wall["start"][0] / 25.4
      sy = wall["start"][1] / 25.4
      ex = wall["end"][0] / 25.4
      ey = wall["end"][1] / 25.4

      dx = ex - sx
      dy = ey - sy
      length = Math.sqrt(dx * dx + dy * dy)
      return if length == 0

      door_pos = door["position"] / 25.4
      door_width = door["width"] / 25.4
      door_height = (door["height"] || DOOR_HEIGHT) / 25.4

      # Centro da porta
      cx = sx + dx * (door_pos / length) + dx * (door_width / 2 / length)
      cy = sy + dy * (door_pos / length) + dy * (door_width / 2 / length)

      # Normal
      nx = -dy / length * (wall["thickness"] || WALL_THICKNESS) / 25.4 / 2
      ny = dx / length * (wall["thickness"] || WALL_THICKNESS) / 25.4 / 2

      half_w = door_width / 2
      half_h = door_height / 2

      pts = [
        Geom::Point3d.new(cx - half_w + nx, cy - half_h + ny, 0),
        Geom::Point3d.new(cx + half_w + nx, cy - half_h + ny, 0),
        Geom::Point3d.new(cx + half_w - nx, cy - half_h - ny, 0),
        Geom::Point3d.new(cx - half_w - nx, cy - half_h - ny, 0),
        Geom::Point3d.new(cx - half_w - nx, cy + half_h - ny, 0),
        Geom::Point3d.new(cx + half_w - nx, cy + half_h - ny, 0),
        Geom::Point3d.new(cx + half_w + nx, cy + half_h + ny, 0),
        Geom::Point3d.new(cx - half_w + nx, cy + half_h + ny, 0)
      ]

      # Criar contorno
      face = definition.entities.add_face(pts)
      face.layer = @model.layers['PORTAS'] if face
    end

    def create_janelas_component
      definition = @model.definitions.add("JANELAS_" + PROJECT_NAME)

      WINDOWS_DATA.each_with_index do |win, i|
        create_window_opening(definition, win, i)
      end

      definition
    end

    def create_window_opening(definition, win, index)
      wall = WALLS_DATA[win["wallIndex"]]
      return unless wall

      sx = wall["start"][0] / 25.4
      sy = wall["start"][1] / 25.4
      ex = wall["end"][0] / 25.4
      ey = wall["end"][1] / 25.4

      dx = ex - sx
      dy = ey - sy
      length = Math.sqrt(dx * dx + dy * dy)
      return if length == 0

      win_pos = win["position"] / 25.4
      win_width = win["width"] / 25.4
      win_height = win["height"] / 25.4
      win_sill = (win["sill"] || WINDOW_SILL) / 25.4

      cx = sx + dx * (win_pos / length) + dx * (win_width / 2 / length)
      cy = sy + dy * (win_pos / length) + dy * (win_width / 2 / length)

      nx = -dy / length * (wall["thickness"] || WALL_THICKNESS) / 25.4 / 2
      ny = dx / length * (wall["thickness"] || WALL_THICKNESS) / 25.4 / 2

      half_w = win_width / 2
      base_y = cy - win_sill + WALL_HEIGHT / 25.4 - win_height

      pts = [
        Geom::Point3d.new(cx - half_w + nx, base_y + ny, 0),
        Geom::Point3d.new(cx + half_w + nx, base_y + ny, 0),
        Geom::Point3d.new(cx + half_w - nx, base_y - ny, 0),
        Geom::Point3d.new(cx - half_w - nx, base_y - ny, 0),
        Geom::Point3d.new(cx - half_w - nx, base_y + win_height - ny, 0),
        Geom::Point3d.new(cx + half_w - nx, base_y + win_height - ny, 0),
        Geom::Point3d.new(cx + half_w + nx, base_y + win_height + ny, 0),
        Geom::Point3d.new(cx - half_w + nx, base_y + win_height + ny, 0)
      ]

      face = definition.entities.add_face(pts)
      face.layer = @model.layers['JANELAS'] if face
    end

    def save_file
      home = ENV['HOME'] || ENV['USERPROFILE'] || Dir.pwd
      filename = "NEXO_" + PROJECT_NAME + "_" + Time.now.strftime("%Y%m%d_%H%M%S") + ".skp"
      output_path = File.join(home, "Desktop", filename)

      @model.save(output_path)
      output_path
    end
  end
end

# ============================================
# EXECUTAR GERAÇÃO
# ============================================
puts "🚀 NEXO CAPTURE - Gerando arquivo SketchUp..."
puts "📋 Projeto: " + NexoCapture::PROJECT_NAME
puts ""

generator = NexoCapture::WallGenerator.new(Sketchup.active_model)
generator.generate
`;
}

export function downloadSketchUpScript(project: ProjectData): void {
  const script = generateSketchUpRubyScript(project);
  const blob = new Blob([script], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nexo-capture-${project.name.replace(/[^a-zA-Z0-9]/g, '-')}.rb`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}