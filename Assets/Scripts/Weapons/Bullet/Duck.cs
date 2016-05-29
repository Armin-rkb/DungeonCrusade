﻿using UnityEngine;
using System.Collections;

public class Duck : MonoBehaviour
{
    //Rigidbody of the Gameobject
    [SerializeField] private Rigidbody2D rbSock;
    //Sprite of this bullet
    [SerializeField] private SpriteRenderer sprite;
    //Speed of the bullet
    [SerializeField] private float speed;
    //Explosion object
    [SerializeField] private GameObject explosionObj;
    private bool isRight;
    private bool isLeft;
    private bool bounce;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
        sprite.flipX = true;
        SoundManager.PlayAudioClip(AudioData.Sock);
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
        SoundManager.PlayAudioClip(AudioData.Sock);
    }
    
    void ExplodeDuck()
    {
        //When the time is up instantiate our explosion obj and remove this obj
        Instantiate(explosionObj, transform.position, transform.rotation);
        Destroy(this.gameObject);
    }

    void FixedUpdate()
    {
        if (isRight)
        {
            rbSock.AddForce(Vector2.up * (speed * 1.5f), ForceMode2D.Impulse);
            rbSock.AddForce(Vector2.right * speed, ForceMode2D.Impulse);
            isRight = false;
        }
        else if (isLeft)
        {
            rbSock.AddForce(Vector2.up * (speed * 2), ForceMode2D.Impulse);
            rbSock.AddForce(Vector2.right * -speed, ForceMode2D.Impulse);
            isLeft = false;
        }
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.CompareTag(GameTags.ground))
            {
                ExplodeDuck();
            }
        }
    }
}