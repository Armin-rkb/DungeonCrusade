using UnityEngine;
using System.Collections;

public class MusicListener : MonoBehaviour {

    [SerializeField]
    private RoundManager _roundManager;

    [SerializeField]
    private AudioSource levelOST;

    void Awake()
    {
        _roundManager.OnGameEnd += StopLevelSoundtrack;
    }

    void StopLevelSoundtrack()
    {
        levelOST.Stop();
    }
}
