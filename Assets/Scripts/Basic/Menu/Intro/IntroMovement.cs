using UnityEngine;
using System.Collections;

public class IntroMovement : MonoBehaviour
{

    [SerializeField]
    private float _movementSpeed;

    [SerializeField]
    private GameObject _pizza;

    [SerializeField]
    private Rigidbody2D _thisRigidBody2D;

    void Update()
    {
        _thisRigidBody2D.velocity = new Vector2(_movementSpeed, 0);
    }

    public void StopP2IntroMovement()
    {
        StartCoroutine("StopMovement");
        SoundManager.PlayAudioClip(AudioData.Hadouken);
    }

    public void ThrowPizza()
    { 
        Instantiate(_pizza, transform.position, Quaternion.identity);
        SoundManager.PlayAudioClip(AudioData.Pizza);
    }

    IEnumerator StopMovement()
    {
        _movementSpeed = 0;
        yield return new WaitForSeconds(1);
        SoundManager.PlayAudioClip(AudioData.Hit);
        SoundManager.PlayAudioClip(AudioData.ScoreUp);
        _movementSpeed = 10;
    }
}
