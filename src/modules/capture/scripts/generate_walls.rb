# ============================================
# NEXO CAPTURE — SketchUp Ruby Script
# Geração de paredes, portas e janelas
# ============================================

# Requer SketchUp instalado com Ruby Console
# Executar via: sketchup --rpccreate "generate_walls.rb"

require 'sketchup'

module NexoCapture
  # ==========================================
  # Constantes
  # ==========================================
  WALL_HEIGHT = 2700.mm        # mm
  WALL_THICKNESS = 150.mm      # mm
  DOOR_WIDTH = 800.mm         # mm
  DOOR_HEIGHT = 2100.mm       # mm
  WINDOW_SILL = 1100.mm       # mm

  # ==========================================
  # Main Generator Class
  # ==========================================
  class WallGenerator
    def initialize(model = Sketchup.active_model)
      @model = model
      @layers = {}
      @definitions = {}
    end

    # ==========================================
    # Gera SKP a partir de dados estruturados
    # ==========================================
    def generate_from_data(walls_data, doors_data, windows_data, options = {})
      # Configurações
      wall_height = options[:wallHeight] || WALL_HEIGHT
      wall_thickness = options[:wallThickness] || WALL_THICKNESS

      # Iniciar operação undo
      @model.start_operation("NEXO Capture - Geração de Paredes", true)

      # Criar layers
      create_layers

      # Criar componentes
      paredes_comp = create_paredes_component(walls_data, wall_height, wall_thickness)
      portas_comp = create_portas_component(walls_data, doors_data, wall_height)
      janelas_comp = create_janelas_component(walls_data, windows_data, wall_height)

      # Adicionar grupo principal
      main_group = @model.entities.add_group
      main_group.name = "NEXO CAPTURE"

      # Mover instâncias para o grupo
      paredes_inst = main_group.entities.add_instance(paredes_comp, ORIGIN)
      portas_inst = main_group.entities.add_instance(portas_comp, ORIGIN)
      janelas_inst = main_group.entities.add_instance(janelas_comp, ORIGIN)

      # Commit da operação
      @model.commit_operation

      # Salvar arquivo
      save_path = options[:outputPath] || "#{ENV['HOME']}/NexoCapture_output.skp"
      @model.save(save_path)

      {
        success: true,
        output_path: save_path,
        component_ids: {
          paredes: paredes_comp.guid,
          portas: portas_comp.guid,
          janelas: janelas_comp.guid
        },
        stats: {
          walls: walls_data.length,
          doors: doors_data.length,
          windows: windows_data.length
        }
      }
    rescue => e
      @model.abort_operation
      { success: false, error: e.message }
    end

    # ==========================================
    # Criar Layers
    # ==========================================
    def create_layers
      layer_names = ['PAREDES', 'PORTAS', 'JANELAS', 'COTAS', 'DIMENSION']

      layer_names.each do |name|
        @layers[name] = @model.layers[name] || @model.layers.add(name)
      end

      # Layer ativo
      @model.layers.active = @layers['PAREDES']
    end

    # ==========================================
    # Criar componente PAREDES
    # ==========================================
    def create_paredes_component(walls_data, wall_height, wall_thickness)
      definition = @model.definitions.add("PAREDES")
      definition.layer = @layers['PAREDES']

      walls_data.each do |wall|
        create_wall_face(definition, wall, wall_height, wall_thickness)
      end

      definition
    end

    # ==========================================
    # Criar face de parede individual
    # ==========================================
    def create_wall_face(definition, wall, wall_height, wall_thickness)
      # Converter mm para polegadas (unidade interna do SketchUp)
      sx = wall[:start][0] / 25.4
      sy = wall[:start][1] / 25.4
      ex = wall[:end][0] / 25.4
      ey = wall[:end][1] / 25.4

      thickness = wall_thickness / 25.4
      height = wall_height / 25.4

      # Calcular direção e normal
      dx = ex - sx
      dy = ey - sy
      length = Math.sqrt(dx * dx + dy * dy)
      angle = Math.atan2(dy, dx)

      # Normal perpendicular (para fora da parede)
      nx = -Math.sin(angle) * thickness
      ny = Math.cos(angle) * thickness

      # Pontos do polígono da parede (vista superior)
      pts = [
        Geom::Point3d.new(sx, sy, 0),
        Geom::Point3d.new(ex, ey, 0),
        Geom::Point3d.new(ex + nx, ey + ny, 0),
        Geom::Point3d.new(sx + nx, sy + ny, 0)
      ]

      # Criar face
      face = definition.entities.add_face(pts)

      # Garantir normal para cima
      face.reverse! if face.normal.z < 0

      # Extrudar para altura
      face.pushpull(-height)

      # Adicionar à layer
      face.layer = @layers['PAREDES']

      face
    end

    # ==========================================
    # Criar componente PORTAS
    # ==========================================
    def create_portas_component(walls_data, doors_data, wall_height)
      definition = @model.definitions.add("PORTAS")
      definition.layer = @layers['PORTAS']

      return definition if doors_data.empty?

      doors_data.each do |door|
        wall = walls_data[door[:wallIndex]]
        next unless wall

        create_door_opening(definition, wall, door, wall_height)
      end

      definition
    end

    # ==========================================
    # Criar abertura de porta (void)
    # ==========================================
    def create_door_opening(definition, wall, door, wall_height)
      # Calcular posição do centro da porta na parede
      sx = wall[:start][0] / 25.4
      sy = wall[:start][1] / 25.4
      ex = wall[:end][0] / 25.4
      ey = wall[:end][1] / 25.4

      dx = ex - sx
      dy = ey - sy
      length = Math.sqrt(dx * dx + dy * dy)
      angle = Math.atan2(dy, dx)

      # Posição da porta
      door_pos = door[:position] / 25.4
      door_width = door[:width] / 25.4
      door_height = (door[:height] || DOOR_HEIGHT) / 25.4

      # Centro da porta
      cx = sx + dx * (door_pos / length) + dx * (door_width / 2 / length)
      cy = sy + dy * (door_pos / length) + dy * (door_width / 2 / length)

      # Normal da parede
      nx = -Math.sin(angle) * (wall[:thickness] || WALL_THICKNESS) / 25.4
      ny = Math.cos(angle) * (wall[:thickness] || WALL_THICKNESS) / 25.4

      # Criar face do vão (retângulo)
      # Desenhar na parede com vazio
      half_w = door_width / 2
      half_h = door_height / 2

      pts = [
        Geom::Point3d.new(cx - half_w, cy - half_h, 0),
        Geom::Point3d.new(cx + half_w, cy - half_h, 0),
        Geom::Point3d.new(cx + half_w, cy + half_h, 0),
        Geom::Point3d.new(cx - half_w, cy + half_h, 0)
      ]

      # Criar face e fazer pushpull negativo para criar vazio
      face = definition.entities.add_face(pts)
      face.pushpull(-wall[:thickness].to_f / 25.4) if wall[:thickness]

      face.layer = @layers['PORTAS']

      face
    end

    # ==========================================
    # Criar componente JANELAS
    # ==========================================
    def create_janelas_component(walls_data, windows_data, wall_height)
      definition = @model.definitions.add("JANELAS")
      definition.layer = @layers['JANELAS']

      return definition if windows_data.empty?

      windows_data.each do |window|
        wall = walls_data[window[:wallIndex]]
        next unless wall

        create_window_opening(definition, wall, window, wall_height)
      end

      definition
    end

    # ==========================================
    # Criar abertura de janela (void)
    # ==========================================
    def create_window_opening(definition, wall, window, wall_height)
      sx = wall[:start][0] / 25.4
      sy = wall[:start][1] / 25.4
      ex = wall[:end][0] / 25.4
      ey = wall[:end][1] / 25.4

      dx = ex - sx
      dy = ey - sy
      length = Math.sqrt(dx * dx + dy * dy)
      angle = Math.atan2(dy, dx)

      window_pos = window[:position] / 25.4
      window_width = window[:width] / 25.4
      window_height = window[:height] / 25.4
      window_sill = (window[:sill] || WINDOW_SILL) / 25.4

      cx = sx + dx * (window_pos / length) + dx * (window_width / 2 / length)
      cy = sy + dy * (window_pos / length) + dy * (window_width / 2 / length)

      nx = -Math.sin(angle) * (wall[:thickness] || WALL_THICKNESS) / 25.4
      ny = Math.cos(angle) * (wall[:thickness] || WALL_THICKNESS) / 25.4

      # Janela com peitoril
      half_w = window_width / 2
      base_y = cy - window_sill + wall_height / 25.4 - window_height

      pts = [
        Geom::Point3d.new(cx - half_w, base_y, 0),
        Geom::Point3d.new(cx + half_w, base_y, 0),
        Geom::Point3d.new(cx + half_w, base_y + window_height, 0),
        Geom::Point3d.new(cx - half_w, base_y + window_height, 0)
      ]

      face = definition.entities.add_face(pts)
      face.pushpull(-wall[:thickness].to_f / 25.4) if wall[:thickness]

      face.layer = @layers['JANELAS']

      face
    end

    # ==========================================
    # Salvar arquivo
    # ==========================================
    def save(path)
      @model.save(path)
      puts "Arquivo salvo em: #{path}"
    end
  end

  # ==========================================
  # Função principal para CLI
  # ==========================================
  def self.generate(walls:, doors: [], windows: [], output: nil, **options)
    generator = WallGenerator.new
    generator.generate_from_data(
      walls,
      doors || [],
      windows || [],
      outputPath: output,
      **options
    )
  end
end

# ==========================================
# Exemplo de uso:
#
# walls = [
#   { start: [0, 0], end: [3500, 0], thickness: 150 },
#   { start: [3500, 0], end: [3500, 4000], thickness: 150 }
# ]
#
# doors = [
#   { wallIndex: 0, position: 1200, width: 800, height: 2100 }
# ]
#
# windows = [
#   { wallIndex: 1, position: 1800, width: 1200, height: 1000, sill: 1100 }
# ]
#
# NexoCapture.generate(walls: walls, doors: doors, windows: windows)
# ==========================================