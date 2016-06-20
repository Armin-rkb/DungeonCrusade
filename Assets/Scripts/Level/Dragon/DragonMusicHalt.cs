using UnityEngine;
using System.Collections;

public class DragonMusicHalt : MonoBehaviour {

    [SerializeField]
    private AudioSource _levelOST;

    [SerializeField]
    private TempleBombDetection _bombExplosion;


    void Awake()
    {
        _bombExplosion.OnBombExplosion += StopMusic;
    }

    void StopMusic()
    {
        _levelOST.Stop();
    }
}
