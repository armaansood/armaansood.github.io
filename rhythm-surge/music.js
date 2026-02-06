// ============================================================================
// RhythmGame Procedural Music Synthesizer — Complete Implementation
// Uses Web Audio API exclusively. No samples. All sound is generated live.
// ============================================================================

const NOTES = {
    C2: 65.41, D2: 73.42, Eb2: 77.78, E2: 82.41, F2: 87.31, G2: 98.00, Ab2: 103.83, Bb2: 116.54,
    C3: 130.81, D3: 146.83, Eb3: 155.56, E3: 164.81, F3: 174.61, G3: 196.00, Ab3: 207.65, Bb3: 233.08,
    C4: 261.63, D4: 293.66, Eb4: 311.13, E4: 329.63, F4: 349.23, G4: 392.00, Ab4: 415.30, Bb4: 466.16,
    C5: 523.25, D5: 587.33, Eb5: 622.25, E5: 659.26, F5: 698.46, G5: 783.99, Ab5: 830.61, Bb5: 932.33
};

// Helper: convert note name to frequency
function noteFreq(name) {
    return NOTES[name] || 440;
}

// ---------------------------------------------------------------------------
// Song configurations
// ---------------------------------------------------------------------------

const SONG_CONFIGS = {

    // ---- 1. Neon Pulse – 120 BPM, chill synthwave ----
    neonPulse: {
        name: 'Neon Pulse',
        bpm: 120,
        key: 'Cm',
        sections: [
            { name: 'intro',  bars: 8  },
            { name: 'verse',  bars: 16 },
            { name: 'chorus', bars: 16 },
            { name: 'outro',  bars: 8  }
        ],
        patterns: {
            // beat indices within a 4-beat bar (16th subdivisions: 0-15)
            drums: {
                intro: {
                    kick:   [0, 4, 8, 12],
                    snare:  [],
                    hihat:  [0, 2, 4, 6, 8, 10, 12, 14],
                    openHH: []
                },
                verse: {
                    kick:   [0, 4, 8, 12],
                    snare:  [4, 12],
                    hihat:  [0, 2, 4, 6, 8, 10, 12, 14],
                    openHH: []
                },
                chorus: {
                    kick:   [0, 4, 8, 12],
                    snare:  [4, 12],
                    hihat:  [0, 2, 4, 6, 8, 10, 12, 14],
                    openHH: [6, 14]
                },
                outro: {
                    kick:   [0, 8],
                    snare:  [],
                    hihat:  [0, 4, 8, 12],
                    openHH: []
                }
            },
            bass: {
                intro:  [],
                verse: [
                    { step: 0,  note: 'C2',  dur: 4 },
                    { step: 4,  note: 'C2',  dur: 4 },
                    { step: 8,  note: 'G2',  dur: 4 },
                    { step: 12, note: 'G2',  dur: 4 }
                ],
                chorus: [
                    { step: 0,  note: 'Ab2', dur: 4 },
                    { step: 4,  note: 'Bb2', dur: 4 },
                    { step: 8,  note: 'C2',  dur: 4 },
                    { step: 12, note: 'G2',  dur: 4 }
                ],
                outro: [
                    { step: 0,  note: 'C2',  dur: 8 },
                    { step: 8,  note: 'G2',  dur: 8 }
                ]
            },
            lead: {
                intro: [],
                verse: [
                    { step: 0,  note: 'C4',  dur: 3 },
                    { step: 4,  note: 'Eb4', dur: 3 },
                    { step: 8,  note: 'G4',  dur: 3 },
                    { step: 12, note: 'Eb4', dur: 3 }
                ],
                chorus: [
                    { step: 0,  note: 'C5',  dur: 2 },
                    { step: 2,  note: 'Bb4', dur: 2 },
                    { step: 4,  note: 'Ab4', dur: 2 },
                    { step: 6,  note: 'G4',  dur: 2 },
                    { step: 8,  note: 'Ab4', dur: 2 },
                    { step: 10, note: 'Bb4', dur: 2 },
                    { step: 12, note: 'C5',  dur: 4 }
                ],
                outro: [
                    { step: 0,  note: 'C5', dur: 8 },
                    { step: 8,  note: 'G4', dur: 8 }
                ]
            },
            pad: {
                intro:  { notes: ['C4','Eb4','G4'], dur: 16 },
                verse:  { notes: ['C4','Eb4','G4'], dur: 16 },
                chorus: { notes: ['Ab3','C4','Eb4'], dur: 16 },
                outro:  { notes: ['C4','Eb4','G4'], dur: 16 }
            },
            arp: null
        },
        leadType: 'sine',
        bassType: 'sawtooth',
        filterSweep: true,
        reverbMix: 0.3,
        energy: 0.5
    },

    // ---- 2. Electric Dreams – 135 BPM, upbeat electro ----
    electricDreams: {
        name: 'Electric Dreams',
        bpm: 135,
        key: 'Dm',
        sections: [
            { name: 'intro',  bars: 8  },
            { name: 'verse',  bars: 16 },
            { name: 'chorus', bars: 16 },
            { name: 'outro',  bars: 8  }
        ],
        patterns: {
            drums: {
                intro: {
                    kick:   [0, 6, 8, 12],
                    snare:  [4, 12],
                    hihat:  [0, 2, 4, 6, 8, 10, 12, 14],
                    openHH: []
                },
                verse: {
                    kick:   [0, 3, 6, 8, 11, 14],
                    snare:  [4, 12],
                    hihat:  [0, 2, 4, 6, 8, 10, 12, 14],
                    openHH: [6, 14]
                },
                chorus: {
                    kick:   [0, 3, 6, 8, 11, 14],
                    snare:  [4, 10, 12, 14],
                    hihat:  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                    openHH: [7, 15]
                },
                outro: {
                    kick:   [0, 8],
                    snare:  [4, 12],
                    hihat:  [0, 4, 8, 12],
                    openHH: []
                }
            },
            bass: {
                intro: [
                    { step: 0, note: 'D2', dur: 2 },
                    { step: 4, note: 'D2', dur: 2 },
                    { step: 8, note: 'A2', dur: 2 },
                    { step: 12,note: 'A2', dur: 2 }
                ],
                verse: [
                    { step: 0,  note: 'D2', dur: 2 },
                    { step: 2,  note: 'D3', dur: 2 },
                    { step: 4,  note: 'D2', dur: 2 },
                    { step: 6,  note: 'F2', dur: 2 },
                    { step: 8,  note: 'A2', dur: 2 },
                    { step: 10, note: 'A2', dur: 2 },
                    { step: 12, note: 'G2', dur: 2 },
                    { step: 14, note: 'F2', dur: 2 }
                ],
                chorus: [
                    { step: 0,  note: 'Bb2', dur: 2 },
                    { step: 2,  note: 'Bb2', dur: 2 },
                    { step: 4,  note: 'A2',  dur: 2 },
                    { step: 6,  note: 'A2',  dur: 2 },
                    { step: 8,  note: 'G2',  dur: 2 },
                    { step: 10, note: 'G2',  dur: 2 },
                    { step: 12, note: 'A2',  dur: 2 },
                    { step: 14, note: 'D3',  dur: 2 }
                ],
                outro: [
                    { step: 0,  note: 'D2', dur: 8 },
                    { step: 8,  note: 'A2', dur: 8 }
                ]
            },
            lead: {
                intro: [],
                verse: [
                    { step: 0,  note: 'D4',  dur: 2 },
                    { step: 2,  note: 'F4',  dur: 2 },
                    { step: 4,  note: 'A4',  dur: 4 },
                    { step: 8,  note: 'G4',  dur: 2 },
                    { step: 10, note: 'F4',  dur: 2 },
                    { step: 12, note: 'E4',  dur: 2 },
                    { step: 14, note: 'D4',  dur: 2 }
                ],
                chorus: [
                    { step: 0,  note: 'D5',  dur: 2 },
                    { step: 2,  note: 'C5',  dur: 1 },
                    { step: 3,  note: 'Bb4', dur: 1 },
                    { step: 4,  note: 'A4',  dur: 4 },
                    { step: 8,  note: 'Bb4', dur: 2 },
                    { step: 10, note: 'A4',  dur: 2 },
                    { step: 12, note: 'G4',  dur: 2 },
                    { step: 14, note: 'A4',  dur: 2 }
                ],
                outro: [
                    { step: 0,  note: 'D5', dur: 8 }
                ]
            },
            pad: {
                intro:  { notes: ['D4','F4','A4'], dur: 16 },
                verse:  null,
                chorus: { notes: ['Bb3','D4','F4'], dur: 16 },
                outro:  { notes: ['D4','F4','A4'], dur: 16 }
            },
            arp: {
                intro:  null,
                verse:  { notes: ['D4','F4','A4','D5'], speed: 4, dur: 16 },
                chorus: { notes: ['Bb3','D4','F4','Bb4'], speed: 4, dur: 16 },
                outro:  null
            }
        },
        leadType: 'square',
        bassType: 'sawtooth',
        filterSweep: false,
        reverbMix: 0.25,
        energy: 0.7
    },

    // ---- 3. Cyber Rush – 150 BPM, driving techno ----
    cyberRush: {
        name: 'Cyber Rush',
        bpm: 150,
        key: 'Em',
        sections: [
            { name: 'intro',   bars: 8  },
            { name: 'buildup', bars: 8  },
            { name: 'drop',    bars: 16 },
            { name: 'break',   bars: 8  },
            { name: 'drop2',   bars: 16 },
            { name: 'outro',   bars: 8  }
        ],
        patterns: {
            drums: {
                intro: {
                    kick:   [0, 4, 8, 12],
                    snare:  [],
                    hihat:  [0, 2, 4, 6, 8, 10, 12, 14],
                    openHH: []
                },
                buildup: {
                    kick:   [0, 2, 4, 6, 8, 10, 12, 14],
                    snare:  [2, 6, 10, 14],
                    hihat:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
                    openHH: []
                },
                drop: {
                    kick:   [0, 4, 8, 12],
                    snare:  [4, 12],
                    hihat:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
                    openHH: [3, 7, 11, 15]
                },
                break: {
                    kick:   [],
                    snare:  [],
                    hihat:  [0, 4, 8, 12],
                    openHH: []
                },
                drop2: {
                    kick:   [0, 3, 4, 8, 11, 12],
                    snare:  [4, 10, 12, 14],
                    hihat:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
                    openHH: [7, 15]
                },
                outro: {
                    kick:   [0, 8],
                    snare:  [],
                    hihat:  [0, 4, 8, 12],
                    openHH: []
                }
            },
            bass: {
                intro: [
                    { step: 0, note: 'E2', dur: 8 },
                    { step: 8, note: 'E2', dur: 8 }
                ],
                buildup: [
                    { step: 0,  note: 'E2', dur: 1 },
                    { step: 2,  note: 'E2', dur: 1 },
                    { step: 4,  note: 'E2', dur: 1 },
                    { step: 6,  note: 'E2', dur: 1 },
                    { step: 8,  note: 'E2', dur: 1 },
                    { step: 10, note: 'E2', dur: 1 },
                    { step: 12, note: 'E2', dur: 1 },
                    { step: 13, note: 'E2', dur: 1 },
                    { step: 14, note: 'E2', dur: 1 },
                    { step: 15, note: 'E2', dur: 1 }
                ],
                drop: [
                    { step: 0,  note: 'E2', dur: 1 },
                    { step: 1,  note: 'E2', dur: 1 },
                    { step: 2,  note: 'E2', dur: 1 },
                    { step: 4,  note: 'G2', dur: 1 },
                    { step: 5,  note: 'G2', dur: 1 },
                    { step: 6,  note: 'G2', dur: 1 },
                    { step: 8,  note: 'A2', dur: 1 },
                    { step: 9,  note: 'A2', dur: 1 },
                    { step: 10, note: 'A2', dur: 1 },
                    { step: 12, note: 'B2', dur: 1 },
                    { step: 13, note: 'B2', dur: 1 },
                    { step: 14, note: 'E2', dur: 1 },
                    { step: 15, note: 'E2', dur: 1 }
                ],
                break: [],
                drop2: [
                    { step: 0,  note: 'E2', dur: 1 },
                    { step: 1,  note: 'E2', dur: 1 },
                    { step: 2,  note: 'G2', dur: 1 },
                    { step: 3,  note: 'A2', dur: 1 },
                    { step: 4,  note: 'E2', dur: 1 },
                    { step: 5,  note: 'E2', dur: 1 },
                    { step: 6,  note: 'B2', dur: 1 },
                    { step: 7,  note: 'A2', dur: 1 },
                    { step: 8,  note: 'G2', dur: 1 },
                    { step: 9,  note: 'G2', dur: 1 },
                    { step: 10, note: 'A2', dur: 1 },
                    { step: 11, note: 'B2', dur: 1 },
                    { step: 12, note: 'E3', dur: 1 },
                    { step: 13, note: 'B2', dur: 1 },
                    { step: 14, note: 'A2', dur: 1 },
                    { step: 15, note: 'G2', dur: 1 }
                ],
                outro: [
                    { step: 0, note: 'E2', dur: 16 }
                ]
            },
            lead: {
                intro: [],
                buildup: [],
                drop: [
                    { step: 0,  note: 'E4',  dur: 2 },
                    { step: 2,  note: 'G4',  dur: 2 },
                    { step: 4,  note: 'A4',  dur: 2 },
                    { step: 6,  note: 'B4',  dur: 2 },
                    { step: 8,  note: 'E5',  dur: 2 },
                    { step: 10, note: 'D5',  dur: 2 },
                    { step: 12, note: 'B4',  dur: 2 },
                    { step: 14, note: 'A4',  dur: 2 }
                ],
                break: [
                    { step: 0,  note: 'E5', dur: 8 },
                    { step: 8,  note: 'B4', dur: 8 }
                ],
                drop2: [
                    { step: 0,  note: 'E5',  dur: 1 },
                    { step: 1,  note: 'D5',  dur: 1 },
                    { step: 2,  note: 'B4',  dur: 1 },
                    { step: 3,  note: 'A4',  dur: 1 },
                    { step: 4,  note: 'G4',  dur: 2 },
                    { step: 6,  note: 'A4',  dur: 2 },
                    { step: 8,  note: 'B4',  dur: 2 },
                    { step: 10, note: 'E5',  dur: 2 },
                    { step: 12, note: 'D5',  dur: 2 },
                    { step: 14, note: 'B4',  dur: 2 }
                ],
                outro: []
            },
            pad: {
                intro:   { notes: ['E3','G3','B3'], dur: 16 },
                buildup: null,
                drop:    null,
                break:   { notes: ['E3','G3','B3'], dur: 16 },
                drop2:   null,
                outro:   { notes: ['E3','G3','B3'], dur: 16 }
            },
            arp: null
        },
        leadType: 'sawtooth',
        bassType: 'sawtooth',
        filterSweep: true,
        reverbMix: 0.2,
        energy: 0.85
    },

    // ---- 4. Digital Storm – 160 BPM, intense DnB-style ----
    digitalStorm: {
        name: 'Digital Storm',
        bpm: 160,
        key: 'Am',
        sections: [
            { name: 'intro',  bars: 8  },
            { name: 'main',   bars: 16 },
            { name: 'break',  bars: 8  },
            { name: 'main2',  bars: 16 },
            { name: 'outro',  bars: 8  }
        ],
        patterns: {
            drums: {
                intro: {
                    kick:   [0, 10],
                    snare:  [4],
                    hihat:  [0, 2, 4, 6, 8, 10, 12, 14],
                    openHH: []
                },
                main: {
                    kick:   [0, 10, 12],
                    snare:  [4, 14],
                    hihat:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
                    openHH: [3, 11]
                },
                break: {
                    kick:   [],
                    snare:  [4, 12],
                    hihat:  [0, 4, 8, 12],
                    openHH: []
                },
                main2: {
                    kick:   [0, 6, 10, 12],
                    snare:  [4, 8, 14],
                    hihat:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
                    openHH: [3, 7, 11, 15]
                },
                outro: {
                    kick:   [0, 10],
                    snare:  [4],
                    hihat:  [0, 4, 8, 12],
                    openHH: []
                }
            },
            bass: {
                intro: [
                    { step: 0,  note: 'A2', dur: 4, wobble: true },
                    { step: 8,  note: 'A2', dur: 4, wobble: true }
                ],
                main: [
                    { step: 0,  note: 'A2', dur: 2, wobble: true },
                    { step: 2,  note: 'A2', dur: 2, wobble: true },
                    { step: 4,  note: 'C3', dur: 2, wobble: true },
                    { step: 6,  note: 'C3', dur: 2, wobble: true },
                    { step: 8,  note: 'G2', dur: 2, wobble: true },
                    { step: 10, note: 'G2', dur: 2, wobble: true },
                    { step: 12, note: 'F2', dur: 2, wobble: true },
                    { step: 14, note: 'E2', dur: 2, wobble: true }
                ],
                break: [],
                main2: [
                    { step: 0,  note: 'A2', dur: 1, wobble: true },
                    { step: 1,  note: 'A2', dur: 1, wobble: true },
                    { step: 2,  note: 'C3', dur: 1, wobble: true },
                    { step: 3,  note: 'C3', dur: 1, wobble: true },
                    { step: 4,  note: 'E3', dur: 1, wobble: true },
                    { step: 5,  note: 'E3', dur: 1, wobble: true },
                    { step: 6,  note: 'C3', dur: 1, wobble: true },
                    { step: 7,  note: 'A2', dur: 1, wobble: true },
                    { step: 8,  note: 'G2', dur: 1, wobble: true },
                    { step: 9,  note: 'G2', dur: 1, wobble: true },
                    { step: 10, note: 'A2', dur: 1, wobble: true },
                    { step: 11, note: 'C3', dur: 1, wobble: true },
                    { step: 12, note: 'E3', dur: 1, wobble: true },
                    { step: 13, note: 'C3', dur: 1, wobble: true },
                    { step: 14, note: 'A2', dur: 1, wobble: true },
                    { step: 15, note: 'G2', dur: 1, wobble: true }
                ],
                outro: [
                    { step: 0, note: 'A2', dur: 16, wobble: true }
                ]
            },
            lead: {
                intro: [],
                main: [
                    { step: 0,  note: 'A4',  dur: 1 },
                    { step: 1,  note: 'C5',  dur: 1 },
                    { step: 2,  note: 'E5',  dur: 2 },
                    { step: 4,  note: 'D5',  dur: 2 },
                    { step: 6,  note: 'C5',  dur: 2 },
                    { step: 8,  note: 'B4',  dur: 2 },
                    { step: 10, note: 'A4',  dur: 2 },
                    { step: 12, note: 'G4',  dur: 2 },
                    { step: 14, note: 'A4',  dur: 2 }
                ],
                break: [
                    { step: 0,  note: 'A4', dur: 16 }
                ],
                main2: [
                    { step: 0,  note: 'E5',  dur: 1 },
                    { step: 1,  note: 'D5',  dur: 1 },
                    { step: 2,  note: 'C5',  dur: 1 },
                    { step: 3,  note: 'B4',  dur: 1 },
                    { step: 4,  note: 'A4',  dur: 1 },
                    { step: 5,  note: 'G4',  dur: 1 },
                    { step: 6,  note: 'A4',  dur: 1 },
                    { step: 7,  note: 'B4',  dur: 1 },
                    { step: 8,  note: 'C5',  dur: 1 },
                    { step: 9,  note: 'D5',  dur: 1 },
                    { step: 10, note: 'E5',  dur: 2 },
                    { step: 12, note: 'D5',  dur: 2 },
                    { step: 14, note: 'C5',  dur: 2 }
                ],
                outro: []
            },
            pad: {
                intro:  { notes: ['A3','C4','E4'], dur: 16 },
                main:   null,
                break:  { notes: ['A3','C4','E4'], dur: 16 },
                main2:  null,
                outro:  { notes: ['A3','C4','E4'], dur: 16 }
            },
            arp: null
        },
        leadType: 'sawtooth',
        bassType: 'sawtooth',
        filterSweep: false,
        reverbMix: 0.15,
        energy: 0.95
    },

    // ---- 5. Infinity Break – 180 BPM, extreme speed ----
    infinityBreak: {
        name: 'Infinity Break',
        bpm: 180,
        key: 'Fm',
        sections: [
            { name: 'intro',  bars: 4  },
            { name: 'main',   bars: 16 },
            { name: 'bridge', bars: 8  },
            { name: 'main2',  bars: 16 },
            { name: 'outro',  bars: 4  }
        ],
        patterns: {
            drums: {
                intro: {
                    kick:   [0, 2, 4, 6, 8, 10, 12, 14],
                    snare:  [4, 12],
                    hihat:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
                    openHH: []
                },
                main: {
                    kick:   [0, 2, 4, 6, 8, 10, 12, 14],
                    snare:  [4, 6, 12, 14],
                    hihat:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
                    openHH: [3, 7, 11, 15]
                },
                bridge: {
                    kick:   [0, 4, 8, 12],
                    snare:  [2, 6, 10, 14],
                    hihat:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
                    openHH: []
                },
                main2: {
                    kick:   [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
                    snare:  [4, 8, 12, 14, 15],
                    hihat:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],
                    openHH: [1, 3, 5, 7, 9, 11, 13, 15]
                },
                outro: {
                    kick:   [0, 4, 8, 12],
                    snare:  [4, 12],
                    hihat:  [0, 4, 8, 12],
                    openHH: []
                }
            },
            bass: {
                intro: [
                    { step: 0, note: 'F2', dur: 4 },
                    { step: 4, note: 'Ab2', dur: 4 },
                    { step: 8, note: 'Bb2', dur: 4 },
                    { step: 12,note: 'C3', dur: 4 }
                ],
                main: [
                    { step: 0,  note: 'F2',  dur: 1 },
                    { step: 1,  note: 'Ab2', dur: 1 },
                    { step: 2,  note: 'F2',  dur: 1 },
                    { step: 3,  note: 'C3',  dur: 1 },
                    { step: 4,  note: 'F2',  dur: 1 },
                    { step: 5,  note: 'Bb2', dur: 1 },
                    { step: 6,  note: 'Ab2', dur: 1 },
                    { step: 7,  note: 'F2',  dur: 1 },
                    { step: 8,  note: 'Eb2', dur: 1 },
                    { step: 9,  note: 'F2',  dur: 1 },
                    { step: 10, note: 'Ab2', dur: 1 },
                    { step: 11, note: 'Bb2', dur: 1 },
                    { step: 12, note: 'C3',  dur: 1 },
                    { step: 13, note: 'Bb2', dur: 1 },
                    { step: 14, note: 'Ab2', dur: 1 },
                    { step: 15, note: 'F2',  dur: 1 }
                ],
                bridge: [
                    { step: 0,  note: 'Bb2', dur: 2 },
                    { step: 2,  note: 'Bb2', dur: 2 },
                    { step: 4,  note: 'Ab2', dur: 2 },
                    { step: 6,  note: 'Ab2', dur: 2 },
                    { step: 8,  note: 'Bb2', dur: 2 },
                    { step: 10, note: 'C3',  dur: 2 },
                    { step: 12, note: 'Eb3', dur: 2 },
                    { step: 14, note: 'C3',  dur: 2 }
                ],
                main2: [
                    { step: 0,  note: 'F2',  dur: 1 },
                    { step: 1,  note: 'F2',  dur: 1 },
                    { step: 2,  note: 'Ab2', dur: 1 },
                    { step: 3,  note: 'Bb2', dur: 1 },
                    { step: 4,  note: 'C3',  dur: 1 },
                    { step: 5,  note: 'C3',  dur: 1 },
                    { step: 6,  note: 'Bb2', dur: 1 },
                    { step: 7,  note: 'Ab2', dur: 1 },
                    { step: 8,  note: 'F2',  dur: 1 },
                    { step: 9,  note: 'Eb2', dur: 1 },
                    { step: 10, note: 'F2',  dur: 1 },
                    { step: 11, note: 'Ab2', dur: 1 },
                    { step: 12, note: 'Bb2', dur: 1 },
                    { step: 13, note: 'C3',  dur: 1 },
                    { step: 14, note: 'Eb3', dur: 1 },
                    { step: 15, note: 'C3',  dur: 1 }
                ],
                outro: [
                    { step: 0, note: 'F2', dur: 16 }
                ]
            },
            lead: {
                intro: [],
                main: [
                    { step: 0,  note: 'F5',  dur: 1 },
                    { step: 1,  note: 'Eb5', dur: 1 },
                    { step: 2,  note: 'C5',  dur: 1 },
                    { step: 3,  note: 'Bb4', dur: 1 },
                    { step: 4,  note: 'Ab4', dur: 1 },
                    { step: 5,  note: 'Bb4', dur: 1 },
                    { step: 6,  note: 'C5',  dur: 1 },
                    { step: 7,  note: 'Eb5', dur: 1 },
                    { step: 8,  note: 'F5',  dur: 1 },
                    { step: 9,  note: 'Eb5', dur: 1 },
                    { step: 10, note: 'C5',  dur: 1 },
                    { step: 11, note: 'Ab4', dur: 1 },
                    { step: 12, note: 'Bb4', dur: 2 },
                    { step: 14, note: 'C5',  dur: 2 }
                ],
                bridge: [
                    { step: 0,  note: 'F5',  dur: 4 },
                    { step: 4,  note: 'Eb5', dur: 4 },
                    { step: 8,  note: 'C5',  dur: 4 },
                    { step: 12, note: 'Eb5', dur: 4 }
                ],
                main2: [
                    { step: 0,  note: 'F5',  dur: 1 },
                    { step: 1,  note: 'Eb5', dur: 1 },
                    { step: 2,  note: 'F5',  dur: 1 },
                    { step: 3,  note: 'Ab5', dur: 1 },
                    { step: 4,  note: 'F5',  dur: 1 },
                    { step: 5,  note: 'Eb5', dur: 1 },
                    { step: 6,  note: 'C5',  dur: 1 },
                    { step: 7,  note: 'Bb4', dur: 1 },
                    { step: 8,  note: 'Ab4', dur: 1 },
                    { step: 9,  note: 'Bb4', dur: 1 },
                    { step: 10, note: 'C5',  dur: 1 },
                    { step: 11, note: 'Eb5', dur: 1 },
                    { step: 12, note: 'F5',  dur: 1 },
                    { step: 13, note: 'Ab5', dur: 1 },
                    { step: 14, note: 'F5',  dur: 1 },
                    { step: 15, note: 'Eb5', dur: 1 }
                ],
                outro: [
                    { step: 0,  note: 'F4', dur: 16 }
                ]
            },
            pad: {
                intro:  null,
                main:   null,
                bridge: { notes: ['F3','Ab3','C4'], dur: 16 },
                main2:  null,
                outro:  { notes: ['F3','Ab3','C4'], dur: 16 }
            },
            arp: {
                intro:  { notes: ['F4','Ab4','C5','F5'], speed: 2, dur: 16 },
                main:   null,
                bridge: null,
                main2:  null,
                outro:  null
            }
        },
        leadType: 'sawtooth',
        bassType: 'square',
        filterSweep: false,
        reverbMix: 0.1,
        energy: 1.0
    }
};
// ---------------------------------------------------------------------------
// MusicEngine class
// ---------------------------------------------------------------------------

class MusicEngine {
    constructor() {
        this.audioCtx = null;
        this.masterGain = null;
        this.compressor = null;
        this.isPlaying = false;
        this.isPaused = false;
        this.bpm = 120;
        this.currentBeat = 0;
        this.songConfig = null;
        this.schedulerTimer = null;
        this.songStartTime = 0;       // audioCtx.currentTime when song started
        this.pauseOffset = 0;
        this.nextStepTime = 0;        // when the next 16th-note step should fire
        this.currentStep = 0;         // which 16th-note step we are on (global)
        this.stepsPerBar = 16;        // sixteenth-note resolution
        this.lookahead = 0.1;         // seconds to schedule ahead
        this.scheduleInterval = 25;   // ms between scheduler ticks
        this.sectionIndex = 0;
        this.barInSection = 0;
        this.totalBars = 0;

        // Volume levels per instrument
        this.volumes = {
            kick:   0.85,
            snare:  0.60,
            hihat:  0.30,
            openHH: 0.28,
            bass:   0.55,
            lead:   0.35,
            pad:    0.18,
            arp:    0.25,
            sfx:    0.50
        };
    }

    // ------------------------------------------------------------------
    // Initialise audio context (must be called from a user gesture)
    // ------------------------------------------------------------------
    init() {
        if (this.audioCtx) return;
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        // Master compressor to glue the mix together
        this.compressor = this.audioCtx.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 12;
        this.compressor.ratio.value = 4;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.15;
        this.compressor.connect(this.audioCtx.destination);

        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.value = 0.8;
        this.masterGain.connect(this.compressor);
    }

    // ------------------------------------------------------------------
    // Timing helpers
    // ------------------------------------------------------------------
    get stepDuration() {
        // Duration of one 16th-note in seconds
        return 60 / this.bpm / 4;
    }

    getCurrentTime() {
        // Returns ms since the song started (for game sync)
        if (!this.audioCtx || !this.isPlaying) return 0;
        if (this.isPaused) return this.pauseOffset * 1000;
        return (this.audioCtx.currentTime - this.songStartTime) * 1000;
    }

    setBPM(bpm) {
        this.bpm = bpm;
    }

    // ------------------------------------------------------------------
    // Transport
    // ------------------------------------------------------------------
    playSong(config) {
        if (!this.audioCtx) this.init();
        this.stop();

        this.songConfig = config;
        this.bpm = config.bpm;
        this.isPlaying = true;
        this.isPaused = false;
        this.currentStep = 0;
        this.sectionIndex = 0;
        this.barInSection = 0;
        this.totalBars = 0;
        this.songStartTime = this.audioCtx.currentTime;
        this.nextStepTime = this.audioCtx.currentTime;

        this._startScheduler();
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        if (this.schedulerTimer) {
            clearInterval(this.schedulerTimer);
            this.schedulerTimer = null;
        }
    }

    pause() {
        if (!this.isPlaying || this.isPaused) return;
        this.isPaused = true;
        this.pauseOffset = this.audioCtx.currentTime - this.songStartTime;
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = null;
        this.audioCtx.suspend();
    }

    resume() {
        if (!this.isPaused) return;
        this.audioCtx.resume();
        this.isPaused = false;
        this.songStartTime = this.audioCtx.currentTime - this.pauseOffset;
        this.nextStepTime = this.audioCtx.currentTime;
        this._startScheduler();
    }

    _startScheduler() {
        this.schedulerTimer = setInterval(() => this._scheduler(), this.scheduleInterval);
    }

    _scheduler() {
        if (!this.isPlaying || this.isPaused) return;
        while (this.nextStepTime < this.audioCtx.currentTime + this.lookahead) {
            this._scheduleStep(this.currentStep, this.nextStepTime);
            this.nextStepTime += this.stepDuration;
            this.currentStep++;

            // Track bar / section progression
            if (this.currentStep % this.stepsPerBar === 0) {
                this.barInSection++;
                this.totalBars++;
                const sec = this.songConfig.sections[this.sectionIndex];
                if (sec && this.barInSection >= sec.bars) {
                    this.barInSection = 0;
                    this.sectionIndex++;
                    if (this.sectionIndex >= this.songConfig.sections.length) {
                        // Loop the song
                        this.sectionIndex = 0;
                    }
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // Get current section name
    // ------------------------------------------------------------------
    _currentSection() {
        const sections = this.songConfig.sections;
        if (this.sectionIndex >= sections.length) return sections[sections.length - 1].name;
        return sections[this.sectionIndex].name;
    }

    // ------------------------------------------------------------------
    // Schedule all instruments for a given 16th-note step
    // ------------------------------------------------------------------
    _scheduleStep(globalStep, time) {
        const stepInBar = globalStep % this.stepsPerBar;
        const section = this._currentSection();
        const patterns = this.songConfig.patterns;

        // ---- Drums ----
        const drumPat = patterns.drums[section];
        if (drumPat) {
            if (drumPat.kick   && drumPat.kick.includes(stepInBar))   this.playKick(time);
            if (drumPat.snare  && drumPat.snare.includes(stepInBar))  this.playSnare(time);
            if (drumPat.hihat  && drumPat.hihat.includes(stepInBar))  this.playHiHat(time, false);
            if (drumPat.openHH && drumPat.openHH.includes(stepInBar)) this.playHiHat(time, true);
        }

        // ---- Bass ----
        const bassPat = patterns.bass[section];
        if (bassPat && Array.isArray(bassPat)) {
            for (const n of bassPat) {
                if (n.step === stepInBar) {
                    this.playBass(time, n.note, n.dur * this.stepDuration, n.wobble || false);
                }
            }
        }

        // ---- Lead ----
        const leadPat = patterns.lead[section];
        if (leadPat && Array.isArray(leadPat)) {
            for (const n of leadPat) {
                if (n.step === stepInBar) {
                    this.playLead(time, n.note, n.dur * this.stepDuration);
                }
            }
        }

        // ---- Pad (trigger once per bar, on step 0) ----
        const padCfg = patterns.pad ? patterns.pad[section] : null;
        if (padCfg && stepInBar === 0) {
            this.playPad(time, padCfg.notes, padCfg.dur * this.stepDuration);
        }

        // ---- Arp ----
        const arpCfg = patterns.arp ? patterns.arp[section] : null;
        if (arpCfg) {
            this.playArp(time, stepInBar, arpCfg.notes, arpCfg.speed, arpCfg.dur);
        }
    }

    // ==================================================================
    //  INSTRUMENTS
    // ==================================================================

    // ------------------------------------------------------------------
    // Kick — sine oscillator with pitch sweep (150 Hz → 40 Hz)
    // ------------------------------------------------------------------
    playKick(time) {
        const ctx = this.audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);

        gain.gain.setValueAtTime(this.volumes.kick, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.36);
    }

    // ------------------------------------------------------------------
    // Snare — white noise (bandpass) + sine body at 200 Hz
    // ------------------------------------------------------------------
    playSnare(time) {
        const ctx = this.audioCtx;

        // Noise component
        const noiseLen = 0.15;
        const bufSize = ctx.sampleRate * noiseLen;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buf;

        const noiseFilt = ctx.createBiquadFilter();
        noiseFilt.type = 'bandpass';
        noiseFilt.frequency.value = 5000;
        noiseFilt.Q.value = 0.8;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(this.volumes.snare, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + noiseLen);

        noise.connect(noiseFilt);
        noiseFilt.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        noise.start(time);
        noise.stop(time + noiseLen + 0.01);

        // Body (sine)
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 200;

        oscGain.gain.setValueAtTime(this.volumes.snare * 0.7, time);
        oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        osc.connect(oscGain);
        oscGain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + 0.09);
    }

    // ------------------------------------------------------------------
    // Hi-Hat — filtered white noise
    // ------------------------------------------------------------------
    playHiHat(time, open) {
        const ctx = this.audioCtx;
        const dur = open ? 0.18 : 0.06;
        const bufSize = Math.ceil(ctx.sampleRate * dur);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

        const src = ctx.createBufferSource();
        src.buffer = buf;

        const filt = ctx.createBiquadFilter();
        filt.type = 'highpass';
        filt.frequency.value = open ? 7000 : 9000;

        const gain = ctx.createGain();
        const vol = open ? this.volumes.openHH : this.volumes.hihat;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        src.connect(filt);
        filt.connect(gain);
        gain.connect(this.masterGain);

        src.start(time);
        src.stop(time + dur + 0.01);
    }

    // ------------------------------------------------------------------
    // Bass — sawtooth/square through lowpass filter with envelope
    // ------------------------------------------------------------------
    playBass(time, note, duration, wobble) {
        const ctx = this.audioCtx;
        const freq = noteFreq(note);
        const dur = Math.max(duration, 0.05);

        const osc = ctx.createOscillator();
        osc.type = this.songConfig.bassType || 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 6;
        filter.frequency.setValueAtTime(freq * 6, time);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + dur * 0.8);

        // Wobble LFO (for DnB style wobble bass)
        if (wobble) {
            const lfo = ctx.createOscillator();
            const lfoGain = ctx.createGain();
            lfo.type = 'sine';
            lfo.frequency.value = this.bpm / 30; // wobble speed tied to tempo
            lfoGain.gain.value = freq * 3;
            lfo.connect(lfoGain);
            lfoGain.connect(filter.frequency);
            lfo.start(time);
            lfo.stop(time + dur + 0.05);
        }

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(this.volumes.bass, time + 0.01);
        gain.gain.setValueAtTime(this.volumes.bass, time + dur * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + dur + 0.05);
    }

    // ------------------------------------------------------------------
    // Lead — two detuned sawtooth oscillators + lowpass, delay
    // ------------------------------------------------------------------
    playLead(time, note, duration) {
        const ctx = this.audioCtx;
        const freq = noteFreq(note);
        const dur = Math.max(duration, 0.05);
        const type = this.songConfig.leadType || 'sawtooth';

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = type;
        osc2.type = type;
        osc1.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq * 1.005, time); // slight detune

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 4, time);
        filter.Q.value = 2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(this.volumes.lead, time + 0.02);
        gain.gain.setValueAtTime(this.volumes.lead, time + dur * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // Simple delay for chorus-like effect
        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = 0.015;
        const delayGain = ctx.createGain();
        delayGain.gain.value = 0.3;

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        // Delay path
        gain.connect(delay);
        delay.connect(delayGain);
        delayGain.connect(this.masterGain);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + dur + 0.05);
        osc2.stop(time + dur + 0.05);
    }

    // ------------------------------------------------------------------
    // Pad — three detuned oscillators (chord), slow attack/release
    // ------------------------------------------------------------------
    playPad(time, noteNames, duration) {
        const ctx = this.audioCtx;
        const dur = Math.max(duration, 0.1);
        const attack = Math.min(dur * 0.3, 0.8);
        const release = Math.min(dur * 0.3, 0.8);
        const sustain = dur - attack - release;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(this.volumes.pad, time + attack);
        if (sustain > 0) {
            gain.gain.setValueAtTime(this.volumes.pad, time + attack + sustain);
        }
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, time);
        if (this.songConfig.filterSweep) {
            filter.frequency.linearRampToValueAtTime(2500, time + dur * 0.5);
            filter.frequency.linearRampToValueAtTime(800, time + dur);
        }
        filter.Q.value = 1;
        filter.connect(gain);
        gain.connect(this.masterGain);

        // Reverb-like delay tail
        const delay1 = ctx.createDelay(1.0);
        delay1.delayTime.value = 0.12;
        const fbGain = ctx.createGain();
        fbGain.gain.value = 0.25;
        gain.connect(delay1);
        delay1.connect(fbGain);
        fbGain.connect(delay1);
        fbGain.connect(this.masterGain);

        for (const name of noteNames) {
            const freq = noteFreq(name);
            for (let d = -1; d <= 1; d++) {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq * (1 + d * 0.003), time);
                osc.connect(filter);
                osc.start(time);
                osc.stop(time + dur + 0.5);
            }
        }
    }

    // ------------------------------------------------------------------
    // Arp — square wave with fast envelope, step-based
    // ------------------------------------------------------------------
    playArp(time, stepInBar, noteNames, speed, totalDur) {
        // Trigger on every `speed`-th step
        if (stepInBar % speed !== 0) return;
        const ctx = this.audioCtx;
        const noteIndex = (stepInBar / speed) % noteNames.length;
        const freq = noteFreq(noteNames[noteIndex]);
        const dur = this.stepDuration * speed * 0.8;

        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 5, time);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.5, time + dur);
        filter.Q.value = 4;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(this.volumes.arp, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // Echo delay
        const delay = ctx.createDelay(1.0);
        delay.delayTime.value = this.stepDuration * speed;
        const delGain = ctx.createGain();
        delGain.gain.value = 0.2;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        gain.connect(delay);
        delay.connect(delGain);
        delGain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + dur + 0.05);
    }

    // ==================================================================
    //  SFX — hit feedback sounds (play immediately)
    // ==================================================================
    playSFX(type) {
        if (!this.audioCtx) return;
        const ctx = this.audioCtx;
        const now = ctx.currentTime;

        switch (type) {
            case 'perfect':
                this._sfxChime(now, 1200, 0.25, 0.4);
                break;
            case 'great':
                this._sfxChime(now, 800, 0.20, 0.3);
                break;
            case 'good':
                this._sfxChime(now, 500, 0.10, 0.2);
                break;
            case 'miss':
                this._sfxBuzz(now);
                break;
            case 'combo_break':
                this._sfxComboBreak(now);
                break;
        }
    }

    // Bright chime
    _sfxChime(time, freq, dur, vol) {
        const ctx = this.audioCtx;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(vol * this.volumes.sfx, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        // High-frequency sparkle overtone
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(freq * 2.5, time);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(vol * this.volumes.sfx * 0.15, time);
        gain2.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.6);

        // Short reverb-like tail
        const delay = ctx.createDelay(0.5);
        delay.delayTime.value = 0.08;
        const fbGain = ctx.createGain();
        fbGain.gain.value = 0.15;

        osc.connect(gain);
        gain.connect(this.masterGain);
        gain.connect(delay);
        delay.connect(fbGain);
        fbGain.connect(delay);
        fbGain.connect(this.masterGain);

        osc2.connect(gain2);
        gain2.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + dur + 0.3);
        osc2.start(time);
        osc2.stop(time + dur * 0.6 + 0.01);
    }

    // Low harsh buzz for miss
    _sfxBuzz(time) {
        const ctx = this.audioCtx;
        const dur = 0.12;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, time);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        filter.Q.value = 5;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35 * this.volumes.sfx, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + dur + 0.01);
    }

    // Descending tone sweep for combo break
    _sfxComboBreak(time) {
        const ctx = this.audioCtx;
        const dur = 0.3;

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + dur);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, time);
        filter.frequency.exponentialRampToValueAtTime(200, time + dur);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4 * this.volumes.sfx, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time);
        osc.stop(time + dur + 0.01);
    }

    // ------------------------------------------------------------------
    // Volume control helpers
    // ------------------------------------------------------------------
    setMasterVolume(v) {
        if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
    }

    setInstrumentVolume(instrument, v) {
        if (instrument in this.volumes) {
            this.volumes[instrument] = Math.max(0, Math.min(1, v));
        }
    }
}

// ---------------------------------------------------------------------------
// Expose globally
// ---------------------------------------------------------------------------
window.MusicEngine = MusicEngine;
window.SONG_CONFIGS = SONG_CONFIGS;