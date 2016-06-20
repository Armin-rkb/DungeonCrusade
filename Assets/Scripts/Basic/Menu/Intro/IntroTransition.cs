using UnityEngine;
using System.Collections;

public class IntroTransition : MonoBehaviour {

    [SerializeField]
    private GameObject[] _turnOn;

	void Start()
    {
        StartCoroutine("TurnOnEverything");
        SoundManager.PlayAudioClip(AudioData.Jump);
        foreach (GameObject turn in _turnOn)
            turn.SetActive(false);
    }

    private IEnumerator TurnOnEverything()
    {
        yield return new WaitForSeconds(4);
        foreach (GameObject turn in _turnOn)
            turn.SetActive(true);
    }
}
