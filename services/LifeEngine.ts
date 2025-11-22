import { Particle, ParticleType, BioStats } from '../types';

export class LifeEngine {
  private particles: Particle[] = [];
  private width: number = 0;
  private height: number = 0;
  private maxParticles: number = 150;
  private spawnRate: number = 0.05; // Chance per frame
  
  constructor() {}

  public resize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  public getParticles(): Particle[] {
    return this.particles;
  }

  public update(): BioStats {
    // 1. Spawning (Birth)
    if (this.particles.length < 20 || (this.particles.length < this.maxParticles && Math.random() < this.spawnRate)) {
      this.spawn();
    }

    // Metrics
    let totalEnergy = 0;
    const counts = { BUILDER: 0, THINKER: 0, FEELER: 0 };
    let totalConnections = 0;

    // 2. Simulation Loop
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Movement & Physics
      p.x += p.vx;
      p.y += p.vy;

      // Wall Bounce (The Universe Container)
      if (p.x < 0 || p.x > this.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.height) p.vy *= -1;

      // Aging & Entropy
      p.age++;
      p.energy -= 0.05; // Cost of living
      
      // Death
      if (p.energy <= 0 || p.age > p.maxAge) {
        this.particles.splice(i, 1);
        continue;
      }

      // Social Interaction (The Mycelial Network)
      p.connections = [];
      for (let j = 0; j < this.particles.length; j++) {
        if (i === j) continue;
        const other = this.particles[j];
        const dx = p.x - other.x;
        const dy = p.y - other.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Connection Threshold
        if (dist < 100) {
           p.connections.push(other.id);
           totalConnections++;
           
           // Synergy: Interaction boosts energy
           // Synergy is higher if types are complementary
           if (p.type === other.type) {
             p.energy += 0.02; // Comfort
           } else {
             p.energy += 0.05; // Learning/Excitement
           }

           // Attraction/Repulsion (Swarm Intelligence)
           const force = (100 - dist) * 0.0001;
           p.vx -= dx * force;
           p.vy -= dy * force;
        }
      }

      // Cap Energy
      p.energy = Math.min(p.energy, 100);

      // Stats Collection
      totalEnergy += p.energy;
      counts[p.type]++;
    }

    // 3. Calculate Bio-Feedback Stats
    const population = this.particles.length;
    const averageEnergy = population > 0 ? totalEnergy / population : 0;
    
    let domType: ParticleType = 'BUILDER';
    if (counts.THINKER > counts.BUILDER && counts.THINKER > counts.FEELER) domType = 'THINKER';
    if (counts.FEELER > counts.BUILDER && counts.FEELER > counts.THINKER) domType = 'FEELER';

    // Synergy score: Avg connections per particle normalized
    // Prevent NaN if population is 0
    const avgConnections = population > 0 ? totalConnections / population : 0;
    const synergy = Math.min(1, avgConnections / 5);

    return {
      population,
      averageEnergy,
      dominantType: domType,
      synergy
    };
  }

  private spawn() {
    const typeRoll = Math.random();
    let type: ParticleType = 'BUILDER';
    if (typeRoll > 0.66) type = 'THINKER';
    else if (typeRoll > 0.33) type = 'FEELER';

    this.particles.push({
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      type,
      energy: 50 + Math.random() * 50,
      age: 0,
      maxAge: 500 + Math.random() * 1000,
      connections: []
    });
  }
}