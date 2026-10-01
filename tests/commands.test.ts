import { describe, expect, it } from 'vitest';
import { searchCommands, type Command } from '../src/ui/commands';

const command = (category: string, label: string): Command => ({ category, label, run: () => {} });
const COMMANDS = [
  command('Fichier', 'Nouveau fichier…'),
  command('Fichier', 'Exporter'),
  command('Calque', 'Nouveau calque'),
  command('Calque', 'Dupliquer le calque'),
  command('Affichage', 'Thème › Thème sombre'),
  command('Outils', 'Éclaircir'),
];
const labels = (q: string) => searchCommands(COMMANDS, q).map((c) => c.label);

describe('searchCommands', () => {
  it('lists everything, in order, without a query', () => {
    expect(labels('  ')).toHaveLength(COMMANDS.length);
  });

  it('ignores case and accents', () => {
    expect(labels('ECLAIR')).toEqual(['Éclaircir']);
    expect(labels('theme')).toEqual(['Thème › Thème sombre']);
  });

  it('puts names that start with the query first, then words that do', () => {
    expect(labels('calque')).toEqual(['Nouveau calque', 'Dupliquer le calque']);
    expect(labels('du')).toEqual(['Dupliquer le calque']);
    expect(labels('nouveau')).toEqual(['Nouveau fichier…', 'Nouveau calque']);
  });

  it('matches every word, in the name or the menu', () => {
    expect(labels('fichier nouveau')).toEqual(['Nouveau fichier…']);
    expect(labels('calque nouv')).toEqual(['Nouveau calque']);
    expect(labels('sombre fichier')).toEqual([]);
  });
});
