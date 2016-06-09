using UnityEngine;
using System.Collections;

public class MenuMusicManager : MonoBehaviour {

    [SerializeField]
    private AudioSource _levelOST;

    [SerializeField]
    private MainMenuButtons _mainMenuButtons;

    [SerializeField]
    private int _soundNum;

    void Awake()
    {
        _mainMenuButtons.OnPlayButton += StopMusic;
        _mainMenuButtons.OnPlayButton += PlaySound;
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
