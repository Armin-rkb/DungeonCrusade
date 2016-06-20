using UnityEngine;
using System.Collections;

public class PlayerSFX : MonoBehaviour {

    [SerializeField]
    private PlayerMovement _playerMovement;
    [SerializeField]
    private PlayerFootStool _playerFootStool;

	void Awake () 
    {
        _playerMovement.OnPlayerJump += PlayJumpSound;
        _playerFootStool.OnFootStool += PlayFootStoolSound;
	}

    void Start()
    {
        SoundManager.PlayAudioClip(AudioData.Barrel);
    }
	
    void PlayJumpSound()
    {
        if (_playerMovement.GetAmountJumps == 0)
            SoundManager.PlayAudioClip(AudioData.Jump);
        else if (_playerMovement.GetAmountJumps == 1)
            SoundManager.PlayAudioClip(18);
    }

    void PlayFootStoolSound()
    {
        SoundManager.PlayAudioClip(17);
    }
}
