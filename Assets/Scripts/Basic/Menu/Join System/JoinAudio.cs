using UnityEngine;
using System.Collections;

public class JoinAudio : MonoBehaviour {

    [SerializeField]
    private JoinCheck _joinCheck;

    bool p1Once;
    bool p2Once;
    bool p3Once;
    bool p4Once;

    void Awake()
    {
        _joinCheck.OnPlayerOneEnter += PlayP1Sound;
        _joinCheck.OnPlayerTwoEnter += PlayP2Sound;
        _joinCheck.OnPlayerThreeEnter += PlayP3Sound;
        _joinCheck.OnPlayerFourEnter += PlayP4Sound;

      //  _joinCheck.OnPlayerReady += PlayReadySound;
    }

    void PlayP1Sound()
    {
        if (!p1Once)
        {
            SoundManager.PlayAudioClip(AudioData.ScoreUp);
            p1Once = true;
        }
    }

    void PlayP2Sound()
    {
        if (!p2Once)
        {
            SoundManager.PlayAudioClip(AudioData.ScoreUp);
            p2Once = true;
        }
    }

    void PlayP3Sound()
    {
        if (!p3Once)
        {
            SoundManager.PlayAudioClip(AudioData.ScoreUp);
            p3Once = true;
        }
    }

    void PlayP4Sound()
    {
        if (!p4Once)
        {
            SoundManager.PlayAudioClip(AudioData.ScoreUp);
            p4Once = true;
        }
    }
}
