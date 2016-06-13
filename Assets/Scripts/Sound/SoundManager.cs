using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class SoundManager : MonoBehaviour
{
    [SerializeField] private List<AudioClip> audioList = new List<AudioClip>();
    static List<AudioClip> newAudioList;
    [SerializeField] private AudioSource audioSource;
    static AudioSource newAudioSource;

    void Awake()
    {
        newAudioList = audioList;
        newAudioSource = audioSource;
    }

    public static void PlayAudioClip(int number)    
    {
        newAudioSource.PlayOneShot(newAudioList[number]);
    }
}
