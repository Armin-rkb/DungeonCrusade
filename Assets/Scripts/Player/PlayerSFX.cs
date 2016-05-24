using UnityEngine;
using System.Collections;

public class PlayerSFX : MonoBehaviour {

	// Use this for initialization
	void Start () {
        SoundManager.PlayAudioClip(AudioData.Barrel);
	}
	
}
