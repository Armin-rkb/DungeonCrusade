using UnityEngine;
using System.Collections;

public class StartScreenMusicListener : MonoBehaviour {

    [SerializeField]
    private AudioSource _levelOST;

    [SerializeField]
    private StartScreen _startScreen;

    [SerializeField]
    private int _soundNum;


	void Awake()
    {
        _startScreen.StartLoading += StopMusic;
        _startScreen.StartLoading += PlaySound;
    }

    void StopMusic()
    {
        _levelOST.Stop();
    }

    void PlaySound()
    {
        SoundManager.PlayAudioClip(_soundNum);
    }
}
